'use strict';

function updateScrollProgress() {
  const fill = document.querySelector('.scroll-progress-fill');
  if (!fill) return;
  const scrollTop = window.scrollY || window.pageYOffset;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
  fill.style.width = `${progress}%`;
}

let progressTicking = false;
window.addEventListener('scroll', () => {
  if (!progressTicking) {
    progressTicking = true;
    requestAnimationFrame(() => {
      updateScrollProgress();
      progressTicking = false;
    });
  }
});

window.addEventListener('load', updateScrollProgress);

// Scroll reveal observer
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
    }
  });
}, { threshold: 0.1 });

window.revealObserver = revealObserver;

document.querySelectorAll('.reveal').forEach((el) => {
  revealObserver.observe(el);
});

// Counter animations for stats
document.querySelectorAll('.stat-num[data-target]').forEach((el) => {
  const target = parseInt(el.getAttribute('data-target'), 10);
  const suffix = el.getAttribute('data-suffix') || '';
  
  const counterObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const duration = 1800;
      let startTime = null;
      
      function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.round(eased * target);
        
        if (target >= 1000) {
          el.textContent = (val >= 1000 ? Math.round(val / 1000) + 'k' : val) + suffix;
        } else {
          el.textContent = val + suffix;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
      
      requestAnimationFrame(animate);
      counterObserver.disconnect();
    }
  }, { threshold: 0.5 });
  
  counterObserver.observe(el);
});

// =========================================
// PREMIUM PORTFOLIO GALLERY ANIMATIONS
// =========================================

// 1. Staggered reveal on scroll — triggers .animated class
const galleryGrid = document.querySelector('.gallery-grid');
if (galleryGrid) {
  const galleryObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      galleryGrid.classList.add('animated');
      galleryObserver.disconnect();
    }
  }, { threshold: 0.15 });
  galleryObserver.observe(galleryGrid);
}

// 2. 3D Tilt effect on gallery items — follows cursor position
document.querySelectorAll('.gallery-item').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max ±6 degrees)
    const rotateY = ((x - centerX) / centerX) * 6;
    const rotateX = ((centerY - y) / centerY) * 6;
    
    card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    card.style.transition = 'transform 0.1s ease, box-shadow 0.3s ease';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease';
  });
});

// 3. Parallax scroll offset for gallery items — subtle depth shift
let ticking = false;
function updateGalleryParallax() {
  const section = document.getElementById('portfolio-section');
  if (!section) return;
  
  const sectionRect = section.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  
  // Only animate when section is in view
  if (sectionRect.top < viewportHeight && sectionRect.bottom > 0) {
    const scrollProgress = (viewportHeight - sectionRect.top) / (viewportHeight + sectionRect.height);
    
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
      // Alternate depth — odd items move slower for layered feel
      const speed = (index % 2 === 0) ? 15 : -10;
      const yOffset = (scrollProgress - 0.5) * speed;
      
      // Only apply parallax when not being hovered (hover has its own transform)
      if (!item.matches(':hover')) {
        item.style.transform = `translateY(${yOffset}px)`;
      }
    });
  }
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateGalleryParallax);
    ticking = true;
  }
}, { passive: true });

// =========================================
// PREMIUM CREATOR MODALS
// =========================================

const modalBackdrop = document.getElementById('modal-backdrop');
const creatorModal = document.getElementById('creator-modal');
const teamModal = document.getElementById('team-modal');

// Close all active modals
function closeAllModals() {
  document.querySelectorAll('.creator-modal-container').forEach(modal => {
    modal.classList.remove('active');
  });
  if (modalBackdrop) {
    modalBackdrop.classList.remove('active');
  }
  document.body.style.overflow = '';
}

// Attach close event to close buttons and backdrop
document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

if (modalBackdrop) {
  modalBackdrop.addEventListener('click', closeAllModals);
}

// Close modals on Escape key press
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

// 1. Creator card click handler to open dynamic bio modal
document.querySelectorAll('.creator-card').forEach(card => {
  card.addEventListener('click', () => {
    const name = card.getAttribute('data-name');
    const role = card.getAttribute('data-role');
    const bio = card.getAttribute('data-bio');
    const quote = card.getAttribute('data-quote');
    const image = card.getAttribute('data-image');
    const statsAttr = card.getAttribute('data-stats') || '';
    
    // Populate modal fields
    const modalImg = document.getElementById('modal-img');
    const modalName = document.getElementById('modal-name');
    const modalRole = document.getElementById('modal-role');
    const modalBio = document.getElementById('modal-bio');
    const modalQuote = document.getElementById('modal-quote');
    const modalStatsContainer = document.getElementById('modal-stats');
    
    if (modalImg) {
      modalImg.src = image;
      modalImg.alt = name;
    }
    if (modalName) modalName.textContent = name;
    if (modalRole) modalRole.textContent = role;
    if (modalBio) modalBio.textContent = bio;
    
    if (modalQuote) {
      if (quote) {
        modalQuote.textContent = `"${quote}"`;
        modalQuote.style.display = 'block';
      } else {
        modalQuote.style.display = 'none';
      }
    }
    
    // Populate stats badges
    if (modalStatsContainer) {
      modalStatsContainer.innerHTML = '';
      if (statsAttr) {
        const stats = statsAttr.split(',');
        stats.forEach(stat => {
          const badge = document.createElement('span');
          badge.className = 'creator-stat-badge';
          badge.textContent = stat.trim();
          modalStatsContainer.appendChild(badge);
        });
      }
    }
    
    // Show modal and backdrop
    if (creatorModal && modalBackdrop) {
      creatorModal.classList.add('active');
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });
});

// 2. Read More button click handler to open team overview modal
const btnCreatorsMore = document.getElementById('btn-creators-more');
if (btnCreatorsMore) {
  btnCreatorsMore.addEventListener('click', () => {
    if (teamModal && modalBackdrop) {
      teamModal.classList.add('active');
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });
}

function initRatingModal() {
  const rateUsBtn = document.getElementById('rate-us-btn');
  const ratingModal = document.getElementById('rating-modal');
  const reviewForm = document.getElementById('review-form');
  const testimonialsGrid = document.querySelector('.testimonials-grid');

  function createMLReplyContainer() {
    let el = document.getElementById('review-ml-reply-card');
    if (!el) {
      el = document.createElement('div');
      el.id = 'review-ml-reply-card';
      el.className = 'review-ml-reply-card glass-card';
      el.hidden = true;
      const heading = document.createElement('div');
      heading.className = 'reply-card-heading';
      heading.textContent = 'AI-generated reply';
      const body = document.createElement('div');
      body.className = 'reply-card-body';
      body.textContent = 'Your custom reply will appear here after review submission.';
      el.append(heading, body);
      const target = document.getElementById('testimonials-section');
      if (target && target.parentNode) {
        target.parentNode.insertBefore(el, target.nextSibling);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  function updateAvatarSelection(selectedInput) {
    document.querySelectorAll('.rating-avatar').forEach((label) => {
      label.classList.toggle('selected', label.querySelector('input') === selectedInput);
    });
  }

  document.querySelectorAll('input[name="review-avatar"]').forEach((input) => {
    input.addEventListener('change', () => {
      updateAvatarSelection(input);
    });
  });

  if (rateUsBtn) {
    rateUsBtn.addEventListener('click', () => {
      if (ratingModal && modalBackdrop) {
        ratingModal.classList.add('active');
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  const viewAllBtn = document.getElementById('view-all-reviews-btn');
  const allReviewsModal = document.getElementById('all-reviews-modal');
  if (viewAllBtn && allReviewsModal && modalBackdrop) {
    viewAllBtn.addEventListener('click', async () => {
      allReviewsModal.classList.add('active');
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (typeof window.renderAllReviewsToModal === 'function') {
        await window.renderAllReviewsToModal();
      }
    });
  }

  if (testimonialsGrid) {
    testimonialsGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.testimonial-card');
      const workImgContainer = event.target.closest('.testimonial-work-img');
      if (card && workImgContainer) {
        const img = workImgContainer.querySelector('img');
        const imgSrc = img ? img.src : '';
        if (!imgSrc) return;
        
        const nameEl = card.querySelector('.testimonial-name');
        const companyEl = card.querySelector('.testimonial-company');
        
        const clientName = nameEl ? nameEl.textContent.trim() : 'Client';
        const placeName = companyEl ? companyEl.textContent.trim() : 'ashmija in color Project';
        
        const imgModal = document.getElementById('testimonial-image-modal');
        const modalImg = document.getElementById('testimonial-modal-img');
        const modalPlace = document.getElementById('testimonial-modal-place');
        const modalClient = document.getElementById('testimonial-modal-client');
        const backdrop = document.getElementById('modal-backdrop');
        
        if (imgModal && modalImg && backdrop) {
          modalImg.src = imgSrc;
          modalImg.alt = `${clientName} project work`;
          if (modalPlace) modalPlace.textContent = placeName;
          if (modalClient) modalClient.textContent = clientName;
          
          imgModal.classList.add('active');
          backdrop.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      }
    });
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => reject(new Error('Image load error'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  if (reviewForm) {
    const mlReplyEl = createMLReplyContainer();
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      console.log('[review-form] submit event fired');

      if (mlReplyEl) {
        mlReplyEl.hidden = true;
        const body = mlReplyEl.querySelector('.reply-card-body');
        if (body) {
          body.textContent = '';
        }
      }

      const formData = new FormData(reviewForm);
      const name = formData.get('reviewerName').trim();
      const company = formData.get('reviewerCompany').trim();
      const rating = formData.get('reviewRating');
      const reviewText = formData.get('reviewText').trim();
      const avatar = formData.get('review-avatar');

      if (!name || !company || !reviewText) {
        alert('Please complete all fields before submitting your review.');
        return;
      }

      const submitBtn = document.getElementById('submit-review-btn') || reviewForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Submit Review';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        if (!window.supabase) {
          throw new Error('Supabase client is not available.');
        }

        if (mlReplyEl) {
          mlReplyEl.hidden = true;
          const body = mlReplyEl.querySelector('.reply-card-body');
          if (body) {
            body.textContent = '';
          }
        }

        let workImage = '';
        const workImageFile = document.getElementById('review-work-image')?.files[0];
        if (workImageFile) {
          try {
            workImage = await compressImage(workImageFile);
          } catch (compressErr) {
            console.warn('[review-form] image compression failed, proceeding without it:', compressErr);
          }
        }

        let avatarUrl = avatar;
        const avatarFile = document.getElementById('review-avatar-file')?.files[0];
        if (avatarFile) {
          try {
            avatarUrl = await compressImage(avatarFile);
          } catch (avatarCompressErr) {
            console.warn('[review-form] avatar image compression failed, falling back to selected avatar:', avatarCompressErr);
          }
        }

        let mlReplyText = null;
        let mlReplyEmoji = null;
        let mlReplySticker = null;
        let mlError = null;
        try {
          console.log('[review-form] requesting ML reply', { review: reviewText, customer_name: name });
          const mlResponse = await fetch('http://127.0.0.1:8000/api/generate-reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              review: reviewText,
              customer_name: name
            })
          });

          if (mlResponse.ok) {
            const mlData = await mlResponse.json();
            console.log('[review-form] ML API response', mlData);
            mlReplyText = mlData.reply || null;
            mlReplyEmoji = mlData.emoji || null;
            mlReplySticker = mlData.sticker || null;
          } else {
            console.warn('[review-form] ML API returned status', mlResponse.status);
          }
        } catch (mlErr) {
          console.warn('[review-form] ML API call failed:', mlErr);
        }

        // Fallback custom reply when ML API is not available
        if (!mlReplyText) {
          const ratingVal = parseInt(rating, 10);
          const ratingWord = ratingVal === 5 ? 'amazing' : ratingVal === 4 ? 'wonderful' : 'great';
          const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
          mlReplyText = `Dear ${formattedName},\n\nThank you so much for your ${ratingWord} review! We're truly honored that you took the time to share your experience with ashmija in color.\n\nYour words inspire us to continue creating beautiful, meaningful art that transforms spaces and touches hearts. We look forward to bringing more color and joy to your world!\n\nWith gratitude,\nThe ashmija in color Team`;
          mlReplyEmoji = '😊';
          mlReplySticker = '😊 🎨';
        }

        // For negative replies from ML, ensure it's short and clean
        if (mlReplyText && mlReplyText.length > 200 && mlReplyText.includes('sincerely apologize')) {
          const nameMatch = mlReplyText.match(/Dear ([^,]+),/);
          const topicMatch = mlReplyText.match(/feedback on ([^—]+)/);
          const customerName = nameMatch ? nameMatch[1] : 'valued customer';
          const topicText = topicMatch ? topicMatch[1].trim() : 'this area';
          
          mlReplyText = `Dear ${customerName},\n\nThank you for your feedback on ${topicText} — we sincerely apologize and are taking immediate action to improve.\n\nWith sincere apologies,\nThe ashmija in color Team`;
        }

        const payload = {
          name,
          company,
          rating: parseInt(rating, 10),
          review_text: workImage ? `${reviewText}||work_image:${workImage}` : reviewText,
          avatar_url: avatarUrl,
          is_approved: false, // requires admin approval
          is_pinned: false,
          created_at: new Date().toISOString()
        };

        const { error } = await window.supabase.from('reviews').insert(payload);
        if (error) throw error;

        const displayText = mlReplyText;

        // Close any open modals (like the rating modal) before showing the reply modal
        closeAllModals();

        const mlReplyModal = document.getElementById('ml-reply-modal');
        const mlReplyModalText = document.getElementById('ml-reply-modal-text');
        const mlReplyModalEmoji = document.getElementById('ml-reply-modal-emoji');
        if (mlReplyModal && mlReplyModalText) {
          mlReplyModalText.textContent = displayText;
          if (mlReplyModalEmoji) {
            mlReplyModalEmoji.textContent = mlReplyEmoji || '';
            mlReplyModalEmoji.style.display = mlReplyEmoji ? 'block' : 'none';
            // Apply consistent animation based on emoji
            const emojiAnimations = {
              '😊': 'emojiPopIn',
              '😁': 'emojiBounce',
              '😄': 'emojiWiggle',
              '🤗': 'emojiFloat',
              '😃': 'emojiSpin',
              '🥰': 'emojiPopIn',
              '😍': 'emojiBounce',
              '🤩': 'emojiWiggle',
              '😌': 'emojiFloat',
              '🙂': 'emojiSpin',
              '😋': 'emojiPopIn',
              '🤠': 'emojiBounce',
              '😎': 'emojiWiggle',
              '🥳': 'emojiFloat',
              '😇': 'emojiSpin',
              '☺️': 'emojiPopIn',
              '😉': 'emojiBounce'
            };
            const animName = emojiAnimations[mlReplyEmoji] || 'emojiPopIn';
            mlReplyModalEmoji.style.animation = `${animName} 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both`;
            // After entrance animation, add continuous idle animation
            setTimeout(() => {
              mlReplyModalEmoji.style.animation = 'emojiIdle 2s ease-in-out infinite';
            }, 600);
          }
          mlReplyModal.classList.add('active');
          if (modalBackdrop) {
            modalBackdrop.classList.add('active');
          }
          document.body.style.overflow = 'hidden';
        }

        if (mlReplyEl) {
          mlReplyEl.hidden = true;
          const body = mlReplyEl.querySelector('.reply-card-body');
          if (body) {
            body.textContent = '';
          }
        }

        console.log('[review-form] mlReplyText=', mlReplyText, 'mlError=', mlError);
        reviewForm.reset();
        updateAvatarSelection(document.querySelector('input[name="review-avatar"]'));

      } catch (err) {
        console.error('[review-form] submit error:', err);
        alert('Failed to submit review. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
}

  // ML Reply Modal close handlers
  const mlReplyModalClose = document.getElementById('ml-reply-modal-close');
  const mlReplyModalOkBtn = document.getElementById('ml-reply-modal-ok-btn');
  if (mlReplyModalClose) {
    mlReplyModalClose.addEventListener('click', () => {
      const modal = document.getElementById('ml-reply-modal');
      if (modal) modal.classList.remove('active');
      if (modalBackdrop) modalBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  if (mlReplyModalOkBtn) {
    mlReplyModalOkBtn.addEventListener('click', () => {
      const modal = document.getElementById('ml-reply-modal');
      if (modal) modal.classList.remove('active');
      if (modalBackdrop) modalBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRatingModal();
    observeGalleryGrid();
    initRealtimeGallery();
  });

/* ================================================================
   DYNAMIC RESPONSIVE MASONRY ENGINE
   ================================================================ */

/**
 * window.layoutMasonry()
 * Responsive Pinterest-style masonry arrangement layout.
 * Absolutely positions items in the shortest column with transitions.
 */
window.layoutMasonry = function () {
  const galleryGrid = document.querySelector('.gallery-grid');
  if (!galleryGrid) return;

  const items = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
  if (items.length === 0) return;

  // Mark grid active for our custom CSS absolute positioning and transitions
  galleryGrid.classList.add('masonry-active');

  // Determine width and columns
  const gridWidth = galleryGrid.getBoundingClientRect().width;
  let columns = 3;
  let gap = 16;

  if (gridWidth < 576) {
    columns = 1;
    gap = 12;
  } else if (gridWidth < 992) {
    columns = 2;
    gap = 12;
  }

  const colWidth = (gridWidth - (columns - 1) * gap) / columns;
  const colHeights = Array(columns).fill(0);

  // Position items
  items.forEach((item) => {
    // 1. Scaled height based on image's actual aspect ratio
    const img = item.querySelector('.gal-inner img');
    let ar = 1.35; // standard museum showcase aspect ratio fallback

    if (img && img.naturalWidth && img.naturalHeight) {
      ar = img.naturalWidth / img.naturalHeight;
    } else if (img) {
      img.addEventListener('load', () => {
        window.layoutMasonry();
      }, { once: true });
    }

    const innerHeight = colWidth / ar;
    const galInner = item.querySelector('.gal-inner');
    if (galInner) {
      galInner.style.height = `${innerHeight}px`;
      galInner.style.transition = 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    }

    // 2. Identify the shortest column
    let minCol = 0;
    let minVal = colHeights[0];
    for (let i = 1; i < columns; i++) {
      if (colHeights[i] < minVal) {
        minVal = colHeights[i];
        minCol = i;
      }
    }

    // 3. Absolute positioning (composites cleanly with hover tilt and scroll parallax)
    const leftPos = minCol * (colWidth + gap);
    const topPos = colHeights[minCol];

    item.style.position = 'absolute';
    item.style.width = `${colWidth}px`;
    item.style.left = `${leftPos}px`;
    item.style.top = `${topPos}px`;

    // 4. Update the column height
    colHeights[minCol] += innerHeight + gap;
  });

  // Calculate maximum height to prevent layout collapses
  const maxHeight = Math.max(...colHeights);
  galleryGrid.style.height = `${maxHeight - gap}px`;
};

// Bind layout to window actions
window.addEventListener('resize', () => {
  window.layoutMasonry();
});

window.addEventListener('load', () => {
  setTimeout(() => {
    window.layoutMasonry();
    window.startLivingGallery();
  }, 150);
});


/* ================================================================
   LIVING GALLERY EXPERIENCE (SHUFFLER)
   ================================================================ */

let livingGalleryInterval = null;

/**
 * window.startLivingGallery()
 * Periodically shuffles artwork positions with smooth visual scale transitions.
 */
window.startLivingGallery = function () {
  const galleryGrid = document.querySelector('.gallery-grid');
  if (!galleryGrid) return;

  if (livingGalleryInterval) {
    clearInterval(livingGalleryInterval);
  }

  // Shuffle every 10 seconds
  livingGalleryInterval = setInterval(() => {
    // Only run when section is in viewport to optimize active rendering
    const rect = galleryGrid.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    const items = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
    if (items.length <= 1) return;

    // Apply premium scaling shuffle transition state
    items.forEach(item => item.classList.add('shuffling'));

    setTimeout(() => {
      // Fisher-Yates array shuffler
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }

      // Re-append items in standard order (browser transitions slide them seamlessly)
      items.forEach(item => {
        item.classList.remove('shuffling');
        galleryGrid.appendChild(item);
      });

      // Update positions
      window.layoutMasonry();
    }, 400); // 400ms visual slide transition delay
  }, 10000);
};


/* ================================================================
   SUPABASE REAL-TIME DATABASE SYNC
   ================================================================ */

/**
 * window.initRealtimeGallery()
 * Dynamic updates subscription for uploads, edits, and deletions.
 */
window.initRealtimeGallery = function () {
  if (!window.supabase) {
    console.warn('[realtime] Supabase not available, skipping realtime database sync.');
    return;
  }

  console.log('[realtime] Subscribing to real-time ashmija in color exhibitions...');

  // 1. Subscribe to portfolio table updates
  window.supabase
    .channel('public:portfolio-main-site')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio' }, async (payload) => {
      console.log('[realtime] Real-time portfolio update received:', payload);
      if (typeof window.renderPortfolioToMainSite === 'function') {
        await window.renderPortfolioToMainSite();
        setTimeout(() => {
          window.layoutMasonry();
        }, 150);
      }
    })
    .subscribe();

  // 2. Subscribe to artists table updates
  window.supabase
    .channel('public:artists-main-site')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'artists' }, async (payload) => {
      console.log('[realtime] Real-time artists update received:', payload);
      if (typeof window.renderArtistsToMainSite === 'function') {
        await window.renderArtistsToMainSite();
      }
    })
    .subscribe();
};


/* ================================================================
   MUTATIONOBSERVER - BULLETPROOF RENDER TRIGGER
   ================================================================ */

/**
 * observeGalleryGrid()
 * Automatically recalculates layout when rendering code injects items.
 */
function observeGalleryGrid() {
  const galleryGrid = document.querySelector('.gallery-grid');
  if (!galleryGrid) return;

  const observer = new MutationObserver(() => {
    window.layoutMasonry();
  });

  observer.observe(galleryGrid, { childList: true });
}
