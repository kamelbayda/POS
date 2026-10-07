import * as storage from './storage';

/** Free trial: this many sales invoices before a subscription is needed. */
export const TRIAL_LIMIT = 15;
const DELETED_KEY = 'pos_trial_deleted_invoices';

/** Invoices used from the trial; deleted ones still count, so deleting doesn't extend it. */
export const trialInvoicesUsed = (invoices: unknown[]) => invoices.length + (Number(storage.getItem(DELETED_KEY)) || 0);

export const countDeletedInvoice = () => storage.setItem(DELETED_KEY, (Number(storage.getItem(DELETED_KEY)) || 0) + 1);
