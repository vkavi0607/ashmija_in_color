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
      entry.target.classList.remove('pre-animate');
    }
  });
}, { threshold: 0.1 });

window.revealObserver = revealObserver;

document.querySelectorAll('.reveal').forEach((el) => {
  // Only hide-then-animate if JS actually runs; CSS alone always keeps content visible.
  el.classList.add('pre-animate');
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
// CREATIONS SHOWCASE
// =========================================

const CREATIONS_SHOWCASE = [
  {
    key: 'cafe',
    label: 'Cafe',
    headline: 'Cafe spaces',
    description: 'Warm lighting, textured finishes, and intimate dining scenes for cafes that feel welcoming from the first glance.',
    accent: '#c89a4b',
    stats: ['Hospitality', '6 images', 'Warm mood'],
    images: [
      'assets/images/creations/cafe-henna-hand-chai.jpg',
      'assets/images/creations/cafe-chai-illamal.jpg',
      'assets/images/creations/cafe-old-school-van-1.jpg',
      'assets/images/creations/cafe-old-school-van-2.jpg',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&h=900&q=80',
    ],
  },
  {
    key: 'residency',
    label: 'Residency',
    headline: 'Residency spaces',
    description: 'Calm interiors, layered neutrals, and comfortable living-room compositions for modern residences.',
    accent: '#8c9c88',
    stats: ['Residential', '6 images', 'Soft tones'],
    images: [
      'assets/images/creations/residency-banana-leaf-1.jpg',
      'assets/images/creations/residency-krishna-hill.jpg',
      'assets/images/creations/residency-peacock-entrance.jpg',
      'assets/images/creations/residency-anklets-lamp.jpg',
      'assets/images/creations/residency-kolam-doorstep.jpg',
      'assets/images/creations/residency-krishna-with-viewer.jpg',
      'assets/images/creations/residency-peacock-anklets-lamp.jpg',
      'assets/images/creations/residency-peacock-kalash-doorway.jpg',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&h=900&q=80&sat=-25',
    ],
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    headline: 'Restaurant spaces',
    description: 'Elegant dining interiors with a richer palette, atmosphere, and visual rhythm for restaurant projects.',
    accent: '#a76f4d',
    stats: ['Dining', '6 images', 'Rich contrast'],
    images: [
      'assets/images/creations/restaurant-floral-poppy.jpg',
      'assets/images/creations/restaurant-abstract-botanical.jpg',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&h=900&q=80',
    ],
  },
  {
    key: 'playschool',
    label: 'Playschool',
    headline: 'Playschool spaces',
    description: 'Playful, colorful learning environments that feel safe, creative, and joyful for children.',
    accent: '#7f9fd2',
    stats: ['Education', '8 images', 'Playful color'],
    images: [
      'assets/images/creations/restaurant-floral-poppy.jpg',
      'assets/images/creations/residency-peacock-entrance.jpg',
      'assets/images/creations/residency-kolam-doorstep.jpg',
      'https://images.unsplash.com/photo-1455763916899-e8b50eca9967?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&h=900&q=80',
      'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=900&h=900&q=80',
    ],
  },
];

function initCreationsShowcase() {
  const section = document.getElementById('portfolio-section');
  if (!section) return;

  const shell = section.querySelector('[data-creation-shell]');
  if (!shell) return;

  section.classList.add('creations-split');

  shell.innerHTML = `
    <div class="creation-idea-copy reveal" data-creation-copy>
      <div class="creation-category-list" data-creation-categories></div>
    </div>
    <div class="creation-stage reveal" data-creation-stage>
      <div class="creation-stage-head">
        <div>
          <div class="creation-stage-kicker" data-creation-placeholder>CAFE</div>
          <h3 class="creation-stage-title" data-creation-title>Cafe</h3>
        </div>
        <button type="button" class="creation-stage-close" aria-label="Reset selection" data-creation-reset>&times;</button>
      </div>
      <div class="creation-stage-body">
        <div class="creation-stage-hero">
          <img data-creation-hero src="" alt="" />
          <div class="creation-stage-meta">
            <div class="creation-stage-description" data-creation-subtitle></div>
          </div>
        </div>
        <div class="creation-stage-side">
          <div class="creation-side-grid" data-creation-grid></div>
        </div>
      </div>
    </div>
  `;

  const titleEl = shell.querySelector('[data-creation-title]');
  const subtitleEl = shell.querySelector('[data-creation-subtitle]');
  const placeholderEl = shell.querySelector('[data-creation-placeholder]');
  const gridEl = shell.querySelector('[data-creation-grid]');
  const categoriesEl = shell.querySelector('[data-creation-categories]');
  const heroEl = shell.querySelector('[data-creation-hero]');
  const stage = shell.querySelector('[data-creation-stage]');
  const resetBtn = shell.querySelector('[data-creation-reset]');

  if (!titleEl || !subtitleEl || !placeholderEl || !gridEl || !categoriesEl || !heroEl || !stage) return;

  const syncActivePhoto = (src) => {
    gridEl.querySelectorAll('.creation-photo').forEach((button) => {
      const img = button.querySelector('img');
      const isActive = Boolean(img && img.src === src);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const setHeroImage = (src, alt) => {
    if (!src) return;
    heroEl.classList.remove('is-swapping');
    // Restart the swap animation even when the image is already visible.
    void heroEl.offsetWidth;
    heroEl.src = src;
    heroEl.alt = alt || 'Creation hero image';
    heroEl.classList.add('is-swapping');
    window.setTimeout(() => heroEl.classList.remove('is-swapping'), 540);
    syncActivePhoto(src);
  };

  const renderCategory = (index) => {
    const item = CREATIONS_SHOWCASE[index] || CREATIONS_SHOWCASE[0];
    section.classList.add('has-selection');
    stage.style.setProperty('--creation-accent', item.accent || '#b8933a');
    stage.dataset.creationKey = item.key || '';
    stage.classList.toggle('creation-stage--compact', item.key === 'playschool');
    titleEl.textContent = item.label;
    subtitleEl.textContent = item.description;
    placeholderEl.textContent = item.label.toUpperCase();
    setHeroImage(item.images[0], `${item.label} hero image`);

    const maxThumbnails = item.key === 'playschool' ? 8 : 6;
    gridEl.innerHTML = item.images.slice(1, maxThumbnails + 1).map((src, imageIndex) => `
      <button type="button" class="creation-photo${imageIndex === 0 ? ' creation-photo-primary' : ''}" data-creation-photo-src="${src}" aria-label="${item.label} image ${imageIndex + 2}">
        <img src="${src}" alt="${item.label} interior ${imageIndex + 2}" loading="lazy">
      </button>
    `).join('');

    syncActivePhoto(item.images[0]);

    categoriesEl.querySelectorAll('[data-creation-index]').forEach((button) => {
      const isActive = Number(button.getAttribute('data-creation-index')) === index;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  categoriesEl.innerHTML = CREATIONS_SHOWCASE.map((item, index) => `
    <button type="button" class="creation-category-card" data-creation-index="${index}" aria-pressed="false" aria-label="${item.label}">
      <span class="creation-category-thumb">
        <img src="${item.images[0]}" alt="${item.label} preview" loading="lazy">
      </span>
      <span class="creation-category-copy">
        <strong>${item.label}</strong>
        <small>${item.headline}</small>
      </span>
    </button>
  `).join('');

  categoriesEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-creation-index]');
    if (!button) return;
    const index = Number(button.getAttribute('data-creation-index'));
    if (Number.isNaN(index)) return;
    renderCategory(index);
  });

  gridEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-creation-photo-src]');
    if (!button) return;
    const src = button.getAttribute('data-creation-photo-src');
    const img = button.querySelector('img');
    setHeroImage(src, img?.alt || 'Creation hero image');
  });

  resetBtn?.addEventListener('click', () => {
    section.classList.remove('has-selection');
    categoriesEl.querySelectorAll('[data-creation-index]').forEach((button, index) => {
      const isActive = index === 0;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    renderCategory(0);
  });

  renderCategory(0);
}

window.initCreationsShowcase = initCreationsShowcase;

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
      return;
    }

    const section = document.getElementById('artists-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function initRatingModal() {
  const STATIC_REVIEWS = [
    {
      name: 'Kavitha',
      company: 'Director, Google Chennai',
      quote: 'ashmija in color transformed our empty lobby into an immersive botanical gallery. Our visitors are consistently wowed at first glance. Truly professional management from sketch to paint.',
      image: 'https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?auto=format&fit=crop&w=900&h=620&q=80',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150',
      date: 'May 18, 2024',
      place: 'Chennai',
    },
    {
      name: 'Vikram',
      company: 'Curator, Taj Group',
      quote: 'We wanted our restaurant wall to reflect the rich heritage of South India in a modern way. The geometric murals Priya designed did exactly that. Absolute masterpiece.',
      image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=900&h=620&q=80',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150',
      date: 'April 7, 2024',
      place: 'Chennai',
    },
    {
      name: 'Ananya',
      company: 'Architect, Nair Villas',
      quote: 'Every detail of the custom installation inside our luxury courtyard was handled flawlessly. The weather-resistant paints are holding up beautifully under direct sun. Highly recommended.',
      image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=900&h=620&q=80',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
      date: 'March 22, 2024',
      place: 'Bengaluru',
    },
  ];

  function renderStaticReviewsList() {
    const allReviewsList = document.getElementById('all-reviews-list');
    if (!allReviewsList) return;

    allReviewsList.innerHTML = STATIC_REVIEWS.map((review) => `
      <article class="testimonial-card glass-card" style="margin-bottom:1rem;">
        <div class="testimonial-work-img">
          <img src="${review.image}" alt="${review.name} project work">
        </div>
        <div class="testimonial-content">
          <div class="testimonial-avatar">
            <img src="${review.avatar}" alt="${review.name}">
          </div>
          <h4 class="testimonial-name">${review.name}</h4>
          <span class="testimonial-company">${review.company}</span>
          <div class="testimonial-stars" aria-label="5 out of 5 stars">
            <i class="ti ti-star-filled" aria-hidden="true"></i>
            <i class="ti ti-star-filled" aria-hidden="true"></i>
            <i class="ti ti-star-filled" aria-hidden="true"></i>
            <i class="ti ti-star-filled" aria-hidden="true"></i>
            <i class="ti ti-star-filled" aria-hidden="true"></i>
          </div>
          <p class="testimonial-quote">${review.quote}</p>
          <time class="testimonial-date">${review.date}</time>
          <div class="creator-stats-wrap" style="margin-top:.8rem;">
            <span class="creator-stat-badge">${review.place}</span>
          </div>
        </div>
      </article>
    `).join('');
  }

  const rateUsBtn = document.getElementById('rate-us-btn');
  const ratingModal = document.getElementById('rating-modal');
  const reviewForm = document.getElementById('review-form');
  const testimonialsGrid = document.querySelector('.testimonials-grid');

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
      renderStaticReviewsList();
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
        
        const clientName = nameEl ? nameEl.textContent.trim() : 'Client';
        
        const imgModal = document.getElementById('testimonial-image-modal');
        const modalImg = document.getElementById('testimonial-modal-img');
        const modalClient = document.getElementById('testimonial-modal-client');
        const backdrop = document.getElementById('modal-backdrop');
        
        if (imgModal && modalImg && backdrop) {
          modalImg.src = imgSrc;
          modalImg.alt = `${clientName} project work`;
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

  function buildReviewTextPayload(reviewText, location, workImage) {
    const parts = [reviewText];
    if (location) parts.push(`location:${location}`);
    if (workImage) parts.push(`work_image:${workImage}`);
    return parts.join('||');
  }

  if (reviewForm && testimonialsGrid) {
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(reviewForm);
      const name = formData.get('reviewerName').trim();
      const company = formData.get('reviewerCompany').trim();
      const locationField = formData.get('reviewerLocation');
      const location = typeof locationField === 'string' ? locationField.trim() : '';
      const rating = formData.get('reviewRating');
      const reviewText = formData.get('reviewText').trim();

      if (!name || !company || !reviewText) {
        alert('Please complete the required fields before submitting your review.');
        return;
      }

      const submitBtn = document.getElementById('submit-review-btn') || reviewForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Submit Review';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const reviewTextSummary = buildReviewTextPayload(reviewText, location, '');
        renderStaticReviewsList?.();
        const allReviewsList = document.getElementById('all-reviews-list');
        if (allReviewsList) {
          const card = document.createElement('article');
          card.className = 'testimonial-card glass-card';
          card.style.marginBottom = '1rem';
          card.innerHTML = `
            <div class="testimonial-content" style="padding-top:0;">
              <span class="creator-role-badge">Thanks for sharing</span>
              <h4 class="testimonial-name">${name}</h4>
              <span class="testimonial-company">${company}</span>
              <div class="testimonial-stars" aria-label="${rating} out of 5 stars">
                <i class="ti ti-star-filled" aria-hidden="true"></i>
                <i class="ti ti-star-filled" aria-hidden="true"></i>
                <i class="ti ti-star-filled" aria-hidden="true"></i>
                <i class="ti ti-star-filled" aria-hidden="true"></i>
                <i class="ti ti-star-filled" aria-hidden="true"></i>
              </div>
              <p class="testimonial-quote">${reviewTextSummary}</p>
            </div>
          `;
          allReviewsList.prepend(card);
        }

        alert('Thanks! This static version does not store reviews, but your feedback can still be shared with the team.');
        reviewForm.reset();
        closeAllModals();
      } catch (err) {
        console.error('[review-form] submit error:', err);
        alert(err?.message ? `Could not process the review form: ${err.message}` : 'Could not process the review form.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
}

function initContactForm() {
  const contactForm = document.getElementById('contact-section-form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitBtn = document.getElementById('btn-contact-submit');
    const originalText = submitBtn ? submitBtn.textContent : 'Send Message';
    const payload = {
      firstName: document.getElementById('contact-first-name')?.value.trim() || '',
      lastName: document.getElementById('contact-last-name')?.value.trim() || '',
      email: document.getElementById('contact-email')?.value.trim() || '',
      phone: document.getElementById('contact-phone')?.value.trim() || '',
      projectType: document.getElementById('contact-project-type')?.value || '',
      message: document.getElementById('contact-message')?.value.trim() || ''
    };

    if (!payload.firstName || !payload.lastName || !payload.email) {
      alert('Please complete your name and email before sending.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      const apiUrl = window.CONTACT_API_URL || 'http://localhost:8080/api/contact';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Failed to send your message.');
      }

      alert('Thank you! Your details have been sent.');
      contactForm.reset();
    } catch (err) {
      console.error('[contact-form] submit error:', err);
      alert(err.message || 'Failed to send your message. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initRatingModal();
  initCreationsShowcase();
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
  if (galleryGrid.closest('.creations-split')) {
    galleryGrid.classList.remove('masonry-active');
    galleryGrid.style.height = '';
    galleryGrid.querySelectorAll('.gallery-item').forEach((item) => {
      item.style.position = '';
      item.style.width = '';
      item.style.left = '';
      item.style.top = '';
    });
    return;
  }

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
  if (galleryGrid.closest('.creations-split')) return;

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
  // Static site version does not subscribe to backend updates.
  return;
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
    if (galleryGrid.closest('.creations-split')) {
      window.initCreationsShowcase?.();
      return;
    }
    window.layoutMasonry();
  });

  observer.observe(galleryGrid, { childList: true });
}
