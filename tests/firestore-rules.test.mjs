// Firestore security rules tests. Run with:  npm run test:rules
// (starts the Firestore emulator, needs Java 11+)
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';

const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));

const env = await initializeTestEnvironment({
  projectId: config.projectId,
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});

const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const anon = env.unauthenticatedContext().firestore();

test.after(() => env.cleanup());

test('a shop can read and write its own data', async () => {
  await assertSucceeds(setDoc(doc(alice, 'shops/alice/products/p1'), { name: 'Pepsi' }));
  await assertSucceeds(getDoc(doc(alice, 'shops/alice/products/p1')));
  await assertSucceeds(getDocs(collection(alice, 'shops/alice/invoices')));
  await assertSucceeds(deleteDoc(doc(alice, 'shops/alice/products/p1')));
});

test('a shop cannot read or write another shop', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'shops/alice/invoices/i1'), { totalUSD: 10 }));
  await assertFails(getDoc(doc(bob, 'shops/alice/invoices/i1')));
  await assertFails(getDocs(collection(bob, 'shops/alice/invoices')));
  await assertFails(setDoc(doc(bob, 'shops/alice/invoices/i2'), { totalUSD: 1 }));
});

test('signed-out clients get nothing', async () => {
  await assertFails(getDoc(doc(anon, 'shops/alice/invoices/i1')));
  await assertFails(setDoc(doc(anon, 'shops/anyone/products/p'), {}));
});

test('old shared collections and credentials are closed', async () => {
  for (const path of ['products/p1', 'invoices/i1', 'settings/global_config', 'users_credentials/a@b.com']) {
    await assertFails(getDoc(doc(alice, path)));
    await assertFails(setDoc(doc(alice, path), { x: 1 }));
  }
});

test('the connectivity probe stays readable but not writable', async () => {
  await assertSucceeds(getDoc(doc(anon, 'test_connection/ping')));
  await assertFails(setDoc(doc(anon, 'test_connection/ping'), { x: 1 }));
});
