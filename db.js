// ================= IndexedDB Manager =================
const DB_NAME = 'CoursesDB';
const DB_VERSION = 1;
const VIDEOS_STORE = 'videos';
const IMAGES_STORE = 'images';

// فتح قاعدة البيانات
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // إنشاء مخزن للفيديوهات
            if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
                const videoStore = db.createObjectStore(VIDEOS_STORE, { keyPath: 'id' });
                videoStore.createIndex('courseId', 'courseId', { unique: false });
            }
            
            // إنشاء مخزن للصور
            if (!db.objectStoreNames.contains(IMAGES_STORE)) {
                const imageStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
                imageStore.createIndex('courseId', 'courseId', { unique: false });
            }
        };
    });
}

// حفظ فيديو في IndexedDB
async function saveVideoToDB(courseId, file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEOS_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEOS_STORE);
        
        const videoData = {
            id: `video_${courseId}`,
            courseId: courseId,
            file: file,
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        };
        
        const request = store.put(videoData);
        request.onsuccess = () => resolve(videoData.id);
        request.onerror = () => reject(request.error);
    });
}

// حفظ صورة في IndexedDB
async function saveImageToDB(courseId, file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        
        const imageData = {
            id: `image_${courseId}`,
            courseId: courseId,
            file: file,
            name: file.name,
            type: file.type,
            size: file.size
        };
        
        const request = store.put(imageData);
        request.onsuccess = () => resolve(imageData.id);
        request.onerror = () => reject(request.error);
    });
}

// جلب فيديو من IndexedDB
async function getVideoFromDB(courseId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEOS_STORE], 'readonly');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.get(`video_${courseId}`);
        
        request.onsuccess = () => {
            const data = request.result;
            if (data && data.file) {
                // تحويل الملف إلى URL للتشغيل
                const url = URL.createObjectURL(data.file);
                resolve({ url, name: data.name, type: data.type });
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// جلب صورة من IndexedDB
async function getImageFromDB(courseId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.get(`image_${courseId}`);
        
        request.onsuccess = () => {
            const data = request.result;
            if (data && data.file) {
                const url = URL.createObjectURL(data.file);
                resolve({ url, name: data.name, type: data.type });
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// حذف فيديو من IndexedDB
async function deleteVideoFromDB(courseId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEOS_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.delete(`video_${courseId}`);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

// حذف صورة من IndexedDB
async function deleteImageFromDB(courseId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.delete(`image_${courseId}`);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}