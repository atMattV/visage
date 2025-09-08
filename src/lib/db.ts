import type { HistoryItem } from '@/components/client/visage-forge-app';
import type { KidsHistoryItem } from '@/components/client/kids-mode';
import type { StoryHistoryItem } from '@/components/client/story-mode';


let db: IDBDatabase;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open('VisageForgeDB', 3); // Bump version for schema change

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kidsHistory')) {
        db.createObjectStore('kidsHistory', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('storyHistory')) {
        db.createObjectStore('storyHistory', { keyPath: 'id' });
      }
    };
  });
}

async function dataUriToBlob(dataUri: string): Promise<Blob> {
    const res = await fetch(dataUri);
    return res.blob();
}

function blobToDataUri(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
    const imageBlobs = await Promise.all(item.images.map(img => dataUriToBlob(img.url)));
    
    const storableItem = {
        ...item,
        images: imageBlobs,
    };

    const db = await initDB();
    const transaction = db.transaction('history', 'readwrite');
    const store = transaction.objectStore('history');

    store.put(storableItem);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getHistory(): Promise<HistoryItem[]> {
    const db = await initDB();
    const transaction = db.transaction('history', 'readonly');
    const store = transaction.objectStore('history');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
            if (!request.result) {
                return resolve([]);
            }
            try {
                const results = await Promise.all(request.result.map(async (item) => {
                    const imagesWithDataUris = await Promise.all(
                        (item.images as Blob[]).map(blob => blobToDataUri(blob))
                    );
                    const images = imagesWithDataUris.map(url => ({ url }));
                    return { ...item, images };
                }));
                results.sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
                resolve(results);
            } catch (error) {
                reject(error);
            }
        };
    });
}

export async function pruneHistory(maxItems: number = 10): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction('history', 'readwrite');
    const store = transaction.objectStore('history');
    const cursorReq = store.openCursor(null, 'prev');
    
    let count = 0;
    cursorReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
            count++;
            if (count > maxItems) {
                cursor.delete();
            }
            cursor.continue();
        }
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function saveKidsHistoryItem(item: KidsHistoryItem): Promise<void> {
    const imageBlob = await dataUriToBlob(item.image);
    
    const storableItem = {
        ...item,
        image: imageBlob,
    };

    const db = await initDB();
    const transaction = db.transaction('kidsHistory', 'readwrite');
    const store = transaction.objectStore('kidsHistory');
    store.put(storableItem);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getKidsHistory(): Promise<KidsHistoryItem[]> {
    const db = await initDB();
    const transaction = db.transaction('kidsHistory', 'readonly');
    const store = transaction.objectStore('kidsHistory');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
            if (!request.result) {
                return resolve([]);
            }
            try {
                const results = await Promise.all(request.result.map(async (item: any) => {
                    const imageUrl = await blobToDataUri(item.image as Blob);
                    return { ...item, image: imageUrl };
                }));
                results.sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
                resolve(results);
            } catch (error) {
                reject(error);
            }
        };
    });
}

export async function pruneKidsHistory(maxItems: number = 10): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction('kidsHistory', 'readwrite');
    const store = transaction.objectStore('kidsHistory');
    const cursorReq = store.openCursor(null, 'prev');
    
    let count = 0;
    cursorReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
            count++;
            if (count > maxItems) {
                cursor.delete();
            }
            cursor.continue();
        }
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}


export async function saveStoryHistoryItem(item: StoryHistoryItem): Promise<void> {
    const scenesWithBlobs = await Promise.all(item.scenes.map(async (scene) => {
        return {
            narrative: scene.narrative,
            imagePrompt: scene.imagePrompt,
            isGeneratingImage: false,
            imageBlob: scene.imageUrl ? await dataUriToBlob(scene.imageUrl) : undefined,
        };
    }));

    const storableItem = {
        id: item.id,
        prompt: item.prompt,
        settings: item.settings,
        scenes: scenesWithBlobs,
        thumbnail: await dataUriToBlob(item.thumbnail),
    };

    const db = await initDB();
    const transaction = db.transaction('storyHistory', 'readwrite');
    const store = transaction.objectStore('storyHistory');
    store.put(storableItem);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getStoryHistory(): Promise<StoryHistoryItem[]> {
    const db = await initDB();
    const transaction = db.transaction('storyHistory', 'readonly');
    const store = transaction.objectStore('storyHistory');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
            if (!request.result) {
                return resolve([]);
            }
             try {
                const results = await Promise.all(request.result.map(async (item: any) => {
                    const scenesWithUrls = await Promise.all(
                        item.scenes.map(async (scene: any) => ({
                            narrative: scene.narrative,
                            imagePrompt: scene.imagePrompt,
                            isGeneratingImage: scene.isGeneratingImage,
                            imageUrl: scene.imageBlob ? await blobToDataUri(scene.imageBlob) : undefined,
                        }))
                    );
                    const thumbnailUrl = await blobToDataUri(item.thumbnail);
                    return { 
                        ...item, 
                        scenes: scenesWithUrls,
                        thumbnail: thumbnailUrl,
                    };
                }));
                results.sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
                resolve(results);
            } catch (error) {
                reject(error);
            }
        };
    });
}

export async function pruneStoryHistory(maxItems: number = 3): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction('storyHistory', 'readwrite');
    const store = transaction.objectStore('storyHistory');
    const cursorReq = store.openCursor(null, 'prev');
    
    let count = 0;
    cursorReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
            count++;
            if (count > maxItems) {
                cursor.delete();
            }
            cursor.continue();
        }
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
