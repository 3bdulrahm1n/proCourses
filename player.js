// ================= PLAYER.JS - COURSE PLAYER =================

// التحقق من صلاحية المشاهدة
function checkAccess(courseId) {
    let session = JSON.parse(localStorage.getItem("currentUser"));
    if (!session) {
        alert("Please login first");
        window.location.href = "index.html";
        return false;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    let user = users.find(u => u.username === session.username);
    
    if (!user) {
        alert("User not found");
        window.location.href = "index.html";
        return false;
    }

    let courses = JSON.parse(localStorage.getItem("courses")) || [];
    let course = courses.find(c => c.id === courseId);
    
    if (!course) {
        alert("Course not found");
        window.location.href = "index.html";
        return false;
    }

    // التحقق من الوصول
    const isEnrolled = user.enrolled?.includes(courseId);
    const isPurchased = user.purchases?.includes(courseId);
    
    if (course.price === 0) {
        if (!isEnrolled) {
            alert("You need to enroll first");
            window.location.href = "index.html#courses";
            return false;
        }
    } else {
        if (!isPurchased) {
            alert("You need to purchase this course first");
            window.location.href = "index.html#courses";
            return false;
        }
    }

    return true;
}

// ================= MAIN CODE =================

// الحصول على معرّف الكورس من الرابط (مرة واحدة فقط)
const urlParams = new URLSearchParams(window.location.search);
const courseId = parseInt(urlParams.get('courseId'));

// التحقق من الصلاحية قبل أي شيء
if (!checkAccess(courseId)) {
    // إذا فشل التحقق، يتم إيقاف تنفيذ باقي الكود
    throw new Error("Access denied");
}

// جلب بيانات الكورس من localStorage
const courses = JSON.parse(localStorage.getItem("courses")) || [];
const course = courses.find(c => c.id === courseId);

const sectionsList = document.getElementById("sectionsList");
const videoWrapper = document.getElementById("videoWrapper");
const sectionTitle = document.getElementById("sectionTitle");

let currentSectionIndex = 0;
let videoElement = null;

// دالة تحويل الوقت من HH:MM:SS إلى ثواني
function timeToSeconds(time) {
    if (!time) return 0;
    const parts = time.split(':');
    return (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
}

// دالة تحديث السكشن النشط
function setActiveSection(index) {
    const allSections = document.querySelectorAll('#sectionsList li');
    allSections.forEach(sec => sec.classList.remove('active'));
    if (allSections[index]) {
        allSections[index].classList.add('active');
        allSections[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    currentSectionIndex = index;
}

// دالة لجلب الفيديو من IndexedDB
async function loadVideoFromDB(courseId) {
    try {
        const videoData = await getVideoFromDB(courseId);
        return videoData;
    } catch (error) {
        console.error("Error loading video from DB:", error);
        return null;
    }
}

// التحقق من وجود الكورس
if (!course) {
    sectionsList.innerHTML = '<li style="color: red;">Course not found</li>';
    videoWrapper.innerHTML = '<p style="color: red; padding: 20px;">Course not found. Please go back and try again.</p>';
} else {
    document.title = `${course.title} - Course Player`;
    
    if (course.sections && course.sections.length > 0) {
        console.log("Sections:", course.sections);
        
        // ترتيب السيكشنات حسب الوقت
        course.sections.sort((a, b) => {
            return timeToSeconds(a.start_time) - timeToSeconds(b.start_time);
        });
        
        // عرض السيكشنات
        course.sections.forEach((section, index) => {
            const li = document.createElement('li');
            li.textContent = `${section.title} (${section.start_time})`;
            li.dataset.start = section.start_time;
            li.dataset.end = section.end_time || '';
            li.dataset.index = index;
            sectionsList.appendChild(li);
        });
        
        // تشغيل الفيديو
        (async function() {
            const isYouTube = course.video && typeof course.video === 'string' && 
                             (course.video.includes('youtube.com') || course.video.includes('youtu.be'));
            const isLocalVideo = course.hasLocalVideo || (course.video && course.video.startsWith('db:'));
            
            if (isYouTube) {
                // معالجة يوتيوب
                let videoId = '';
                if (course.video.includes('youtube.com/watch')) {
                    videoId = course.video.split('v=')[1];
                    if (videoId.includes('&')) videoId = videoId.split('&')[0];
                } else if (course.video.includes('youtu.be')) {
                    videoId = course.video.split('youtu.be/')[1];
                    if (videoId.includes('?')) videoId = videoId.split('?')[0];
                }
                
                if (videoId) {
                    const iframe = document.createElement('iframe');
                    iframe.width = '100%';
                    iframe.height = '100%';
                    iframe.src = `https://www.youtube.com/embed/${videoId}`;
                    iframe.frameBorder = '0';
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = true;
                    videoWrapper.appendChild(iframe);
                    
                    // إضافة حدث النقر للسيكشنات
                    document.querySelectorAll('#sectionsList li').forEach((li, index) => {
                        li.onclick = function() {
                            const startTime = this.dataset.start;
                            if (startTime) {
                                const seconds = timeToSeconds(startTime);
                                iframe.src = `https://www.youtube.com/embed/${videoId}?start=${seconds}&autoplay=1`;
                                sectionTitle.textContent = course.sections[index].title;
                                setActiveSection(index);
                            }
                        };
                    });
                    
                    sectionTitle.textContent = course.sections[0]?.title || 'Course Video';
                }
            } else if (isLocalVideo) {
                // فيديو محلي من IndexedDB
                const videoData = await loadVideoFromDB(course.id);
                
                if (videoData) {
                    videoElement = document.createElement('video');
                    videoElement.controls = true;
                    videoElement.autoplay = true;
                    videoElement.style.width = '100%';
                    videoElement.style.height = '100%';
                    videoElement.src = videoData.url;
                    
                    videoWrapper.appendChild(videoElement);
                    
                    // مراقبة وقت التشغيل
                    videoElement.addEventListener('timeupdate', function() {
                        const currentTime = this.currentTime;
                        
                        for (let i = 0; i < course.sections.length; i++) {
                            const section = course.sections[i];
                            const startSec = timeToSeconds(section.start_time);
                            const endSec = section.end_time ? timeToSeconds(section.end_time) : Infinity;
                            
                            if (currentTime >= startSec && currentTime < endSec) {
                                if (i !== currentSectionIndex) {
                                    sectionTitle.textContent = section.title;
                                    setActiveSection(i);
                                }
                                break;
                            }
                        }
                    });
                    
                    // إضافة حدث النقر للسيكشنات
                    document.querySelectorAll('#sectionsList li').forEach((li, index) => {
                        li.onclick = function() {
                            const startTime = this.dataset.start;
                            if (startTime && videoElement) {
                                videoElement.currentTime = timeToSeconds(startTime);
                                videoElement.play().catch(e => console.log("Play error:", e));
                                sectionTitle.textContent = course.sections[index].title;
                                setActiveSection(index);
                            }
                        };
                    });
                    
                    // بدء التشغيل من أول سكشن
                    videoElement.addEventListener('loadedmetadata', function() {
                        if (course.sections.length > 0) {
                            videoElement.currentTime = timeToSeconds(course.sections[0].start_time);
                            sectionTitle.textContent = course.sections[0].title;
                            setActiveSection(0);
                        }
                    });
                    
                    sectionTitle.textContent = course.sections[0]?.title || 'Course Video';
                    
                    // تنظيف الـ URL عند إغلاق الصفحة
                    window.addEventListener('beforeunload', () => {
                        URL.revokeObjectURL(videoData.url);
                    });
                } else {
                    videoWrapper.innerHTML = '<p style="padding: 20px; color: red;">Error loading video from database.</p>';
                }
            } else if (course.video) {
                // رابط فيديو خارجي مباشر
                videoElement = document.createElement('video');
                videoElement.controls = true;
                videoElement.autoplay = true;
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.src = course.video;
                
                videoWrapper.appendChild(videoElement);
                
                // مراقبة وقت التشغيل
                videoElement.addEventListener('timeupdate', function() {
                    const currentTime = this.currentTime;
                    for (let i = 0; i < course.sections.length; i++) {
                        const section = course.sections[i];
                        const startSec = timeToSeconds(section.start_time);
                        const endSec = section.end_time ? timeToSeconds(section.end_time) : Infinity;
                        
                        if (currentTime >= startSec && currentTime < endSec) {
                            if (i !== currentSectionIndex) {
                                sectionTitle.textContent = section.title;
                                setActiveSection(i);
                            }
                            break;
                        }
                    }
                });
                
                // إضافة حدث النقر للسيكشنات
                document.querySelectorAll('#sectionsList li').forEach((li, index) => {
                    li.onclick = function() {
                        const startTime = this.dataset.start;
                        if (startTime && videoElement) {
                            videoElement.currentTime = timeToSeconds(startTime);
                            videoElement.play();
                            sectionTitle.textContent = course.sections[index].title;
                            setActiveSection(index);
                        }
                    };
                });
                
                // بدء التشغيل من أول سكشن
                videoElement.addEventListener('loadedmetadata', function() {
                    if (course.sections.length > 0) {
                        videoElement.currentTime = timeToSeconds(course.sections[0].start_time);
                        sectionTitle.textContent = course.sections[0].title;
                        setActiveSection(0);
                    }
                });
                
                sectionTitle.textContent = course.sections[0]?.title || 'Course Video';
            }
        })();
    } else {
        sectionsList.innerHTML = '<li>No sections available for this course</li>';
        videoWrapper.innerHTML = '<p style="padding: 20px;">This course has no sections defined.</p>';
    }
}
// تحديث التقدم
function updateProgress() {
    if (!videoElement || totalDuration === 0) return;
    
    const currentTime = videoElement.currentTime;
    const progress = (currentTime / totalDuration) * 100;
    
    // تحديث واجهة المستخدم
    progressFill.style.width = `${progress}%`;
    progressPercentage.textContent = `${Math.round(progress)}%`;
    timeDisplay.textContent = `${secondsToTime(currentTime)} / ${secondsToTime(totalDuration)}`;
    
    // تحديث localStorage
    enrollment.lastWatched = currentTime;
    enrollment.progress = progress;
    enrollment.lastAccess = new Date().toISOString();
    
    // تحديث السيكشنات المكتملة
    course.sections.forEach((section, index) => {
        const startSec = timeToSeconds(section.start_time);
        const endSec = section.end_time ? timeToSeconds(section.end_time) : Infinity;
        if (currentTime >= endSec && !enrollment.completedSections.includes(index)) {
            enrollment.completedSections.push(index);
        }
    });
    
    users[userIndex] = user;
    localStorage.setItem("users", JSON.stringify(users));
    
    // تحديث شكل السيكشنات
    updateSectionsCompletion();
    
    // تحديث الـ Progress Bar في الصفحة الرئيسية (إذا كانت مفتوحة)
    // هنستخدم localStorage كوسيلة للتواصل بين الصفحات
    localStorage.setItem('lastProgress', JSON.stringify({
        courseId: courseId,
        progress: progress,
        timestamp: Date.now()
    }));
}
// زر العودة
function goBack() {
    window.history.back();
}