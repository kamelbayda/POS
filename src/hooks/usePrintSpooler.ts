import React, { useState, useEffect } from 'react';
import { Invoice, SystemSettings } from '../types';

export interface UsePrintSpoolerDeps {
  lang: "ar" | "en";
  settings: SystemSettings;
  setShowInvoiceReceipt: React.Dispatch<React.SetStateAction<Invoice>>;
  showToast: (type: "success" | "error" | "warning", message: string) => void;
}

export function usePrintSpooler({
  lang,
  settings,
  setShowInvoiceReceipt,
  showToast,
}: UsePrintSpoolerDeps) {
  // --- INTEGRATED ARONIUM PRINTERS & SPOOLER STATES ---
  const [activePrintJobs, setActivePrintJobs] = useState<Array<{
    id: string;
    printerName: string;
    jobName: string;
    status: 'spooling' | 'printing' | 'completed' | 'error';
    progress: number;
    content: string;
    timestamp: string;
  }>>([]);

  const playPrinterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.1);
      osc.frequency.setValueAtTime(100, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      
      gainNode.gain.setValueAtTime(0.0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gainNode.gain.setValueAtTime(0.12, now + 0.35);
      gainNode.gain.linearRampToValueAtTime(0.0, now + 0.45);
      
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(155, now + 0.5);
      osc2.frequency.setValueAtTime(145, now + 0.65);
      osc2.connect(gainNode);
      
      gainNode.gain.setValueAtTime(0.1, now + 0.5);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.8);
      gainNode.gain.linearRampToValueAtTime(0.0, now + 0.9);
      
      osc.start(now);
      osc.stop(now + 0.45);
      osc2.start(now + 0.5);
      osc2.stop(now + 0.9);
    } catch (err) {
      console.log("Audio feedback ignored", err);
    }
  };

  const addPrintJob = (printerName: string, jobName: string, content: string) => {
    const jobID = `job-${Date.now()}`;
    const newJob = {
      id: jobID,
      printerName,
      jobName,
      status: 'spooling' as const,
      progress: 10,
      content,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setActivePrintJobs(prev => [newJob, ...prev]);
    playPrinterSound();

    let prog = 10;
    const interval = setInterval(() => {
      prog += 30;
      if (prog >= 100) {
        clearInterval(interval);
        setActivePrintJobs(prev => prev.map(j => j.id === jobID ? { ...j, status: 'completed' as const, progress: 100 } : j));
        showToast('success', lang === 'ar' ? `✔️ اكتملت طباعة [${jobName}] على طابعة ${printerName}` : `✔️ Completed printing ${jobName} on ${printerName}`);
      } else {
        setActivePrintJobs(prev => prev.map(j => j.id === jobID ? { ...j, status: 'printing' as const, progress: prog } : j));
      }
    }, 600);
  };

  useEffect(() => {
    const handleDirectPrintEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ elementId: string; textContents: string }>;
      const { elementId, textContents } = customEv.detail;
      
      let printerName = 'طابعة الكاشير الافتراضية (Aronium)';
      let jobName = 'فاتورة كاشير سريعة';

      if (elementId === 'thermal-paper-print') {
        const assignedId = settings.printerAssignments?.receiptPrinterId;
        const assigned = (settings.printersList || []).find((pr: any) => pr.id === assignedId);
        printerName = assigned ? assigned.name : 'XP-80 POS Thermal';
        jobName = 'فاتورة مبيعات عملاء - POS Receipt';
      } else if (elementId === 'barcode-paper-roll-print-area') {
        printerName = 'طابعة باركود الملصقات Labels';
        jobName = 'طباعة ملصقات الباركود والأسعار';
      } else if (elementId === 'report-paper-sheet-content') {
        const assignedId = settings.printerAssignments?.targetPrinterId;
        const assigned = (settings.printersList || []).find((pr: any) => pr.id === assignedId);
        printerName = assigned ? assigned.name : 'HP LaserJet 400 M402 (A4)';
        jobName = 'تقرير تدقيق مبيعات وجرد أرباح';
      }

      // Automatically spool the print job inside our Aronium background spooler with tick sound
      addPrintJob(printerName, jobName, textContents);

      // Auto dismiss/advance after print
      if (elementId === 'thermal-paper-print') {
        setTimeout(() => {
          setShowInvoiceReceipt(null);
        }, 1200);
      }
    };

    window.addEventListener('aronium-direct-print', handleDirectPrintEvent);
    return () => {
      window.removeEventListener('aronium-direct-print', handleDirectPrintEvent);
    };
  }, [settings, lang]);

  return {
    activePrintJobs,
    setActivePrintJobs,
    addPrintJob,
  };
}
