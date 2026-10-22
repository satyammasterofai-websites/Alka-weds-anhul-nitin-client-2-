import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CURRENT_REMIX_CARD_ID, CURRENT_REMIX_WEBSITE_NAME, sanitizeCardIdForSave } from './cardInstance';

const CHUNK_SIZE = 500000; // ~500KB per chunk

export async function saveLargeFile(id: string, dataUrl: string, targetCardId?: string): Promise<string> {
  const chunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
  
  // Guarantee strict namespace isolation for this remix website
  const cardNamespace = targetCardId ? sanitizeCardIdForSave(targetCardId) : CURRENT_REMIX_CARD_ID;
  
  // Clean raw id by stripping any legacy or foreign prefixes
  let cleanId = id || 'asset';
  cleanId = cleanId
    .replace(/^official-wedding-card-?/, '')
    .replace(/^nitin-sir-client-2-?/, '')
    .replace(/^nitin sir client -2-?/, '')
    .replace(/^anshul-alka-2-?/, '')
    .replace(/^remix-v1-?/, '');
  
  // Remove existing namespace prefix if already present so it does not repeat
  if (cleanId.startsWith(`${cardNamespace}-`)) {
    cleanId = cleanId.substring(`${cardNamespace}-`.length);
  }

  const safeId = `${cardNamespace}-${cleanId}`;
  
  const uploadPromise = async () => {
    // Save metadata FIRST with client identification
    await setDoc(doc(db, 'wedding_invitations', `file-meta-${safeId}`), {
      chunks,
      timestamp: Date.now(),
      clientName: CURRENT_REMIX_WEBSITE_NAME,
      clientId: cardNamespace,
      fileId: safeId
    });

    // Save chunks in small batches to prevent network congestion
    for (let i = 0; i < chunks; i += 3) {
      const batch = [];
      for (let j = 0; j < 3 && i + j < chunks; j++) {
        const chunkIndex = i + j;
        const chunkData = dataUrl.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
        batch.push(
          setDoc(doc(db, 'wedding_invitations', `file-chunk-${safeId}-${chunkIndex}`), {
            data: chunkData
          })
        );
      }
      await Promise.all(batch);
    }
    
    return `ecard-file://${safeId}`;
  };

  // Add a 45-second timeout to prevent infinite hanging on bad connections
  return Promise.race([
    uploadPromise(),
    new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error("Upload timed out. Please check your internet connection and try again.")), 45000)
    )
  ]);
}

export async function loadLargeFile(id: string): Promise<string | null> {
  if (!id.startsWith('ecard-file://')) return id;
  const actualId = id.replace('ecard-file://', '');
  
  try {
    let metaSnap = await getDoc(doc(db, 'wedding_invitations', `file-meta-${actualId}`));
    let resolvedId = actualId;
    
    // Fallback lookup if reading seed template assets from the parent client
    if (!metaSnap.exists() && !actualId.startsWith('nitin-sir-client-2-')) {
      const altSnap = await getDoc(doc(db, 'wedding_invitations', `file-meta-nitin-sir-client-2-${actualId}`));
      if (altSnap.exists()) {
        metaSnap = altSnap;
        resolvedId = `nitin-sir-client-2-${actualId}`;
      }
    }

    if (!metaSnap.exists()) return null;
    
    const chunks = metaSnap.data().chunks;
    let dataUrl = '';
    
    for (let i = 0; i < chunks; i++) {
      const chunkSnap = await getDoc(doc(db, 'wedding_invitations', `file-chunk-${resolvedId}-${i}`));
      if (chunkSnap.exists()) {
        dataUrl += chunkSnap.data().data;
      }
    }
    
    return dataUrl;
  } catch (e) {
    console.error("Error loading large file:", e);
    return null;
  }
}
