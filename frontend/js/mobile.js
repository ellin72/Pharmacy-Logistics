// Mobile-specific enhancements: swipe gestures, pull-to-refresh, bottom navigation

// Swipe gesture detection
class SwipeDetector {
  constructor(element, options = {}) {
    this.element = element;
    this.startX = 0;
    this.startY = 0;
    this.threshold = options.threshold || 50;
    this.onSwipeLeft = options.onSwipeLeft || null;
    this.onSwipeRight = options.onSwipeRight || null;
    this.onSwipeUp = options.onSwipeUp || null;
    this.onSwipeDown = options.onSwipeDown || null;
    
    this.init();
  }

  init() {
    this.element.addEventListener('touchstart', (e) => {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
    }, { passive: true });

    this.element.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - this.startX;
      const diffY = endY - this.startY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (Math.abs(diffX) > this.threshold) {
          if (diffX > 0 && this.onSwipeRight) {
            this.onSwipeRight();
          } else if (diffX < 0 && this.onSwipeLeft) {
            this.onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(diffY) > this.threshold) {
          if (diffY > 0 && this.onSwipeDown) {
            this.onSwipeDown();
          } else if (diffY < 0 && this.onSwipeUp) {
            this.onSwipeUp();
          }
        }
      }
    }, { passive: true });
  }
}

// Pull-to-refresh
class PullToRefresh {
  constructor(element, onRefresh) {
    this.element = element;
    this.onRefresh = onRefresh;
    this.startY = 0;
    this.currentY = 0;
    this.pulling = false;
    this.refreshIndicator = null;
    
    this.init();
  }

  init() {
    // Create refresh indicator
    this.refreshIndicator = document.createElement('div');
    this.refreshIndicator.className = 'pull-to-refresh-indicator';
    this.refreshIndicator.innerHTML = '⬇️ Pull to refresh';
    this.refreshIndicator.style.cssText = `
      position: fixed;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 1rem;
      background: var(--primary-color);
      color: white;
      border-radius: 0 0 0.5rem 0.5rem;
      z-index: 1000;
      transition: top 0.3s ease;
      text-align: center;
      font-size: 0.875rem;
    `;
    document.body.appendChild(this.refreshIndicator);

    this.element.addEventListener('touchstart', (e) => {
      if (this.element.scrollTop === 0) {
        this.startY = e.touches[0].clientY;
        this.pulling = true;
      }
    }, { passive: true });

    this.element.addEventListener('touchmove', (e) => {
      if (this.pulling && this.element.scrollTop === 0) {
        this.currentY = e.touches[0].clientY;
        const pullDistance = this.currentY - this.startY;
        
        if (pullDistance > 0 && pullDistance < 100) {
          this.refreshIndicator.style.top = `${pullDistance - 60}px`;
          this.refreshIndicator.innerHTML = pullDistance > 50 ? '⬆️ Release to refresh' : '⬇️ Pull to refresh';
        }
      }
    }, { passive: true });

    this.element.addEventListener('touchend', () => {
      if (this.pulling) {
        const pullDistance = this.currentY - this.startY;
        
        if (pullDistance > 50) {
          // Trigger refresh
          this.refreshIndicator.innerHTML = '🔄 Refreshing...';
          this.refreshIndicator.style.top = '0px';
          
          if (this.onRefresh) {
            this.onRefresh().then(() => {
              setTimeout(() => {
                this.refreshIndicator.style.top = '-60px';
                this.pulling = false;
              }, 500);
            });
          }
        } else {
          this.refreshIndicator.style.top = '-60px';
          this.pulling = false;
        }
      }
    }, { passive: true });
  }
}

// Bottom navigation bar
function createBottomNavigation() {
  // Only show on mobile
  if (window.innerWidth > 768) return null;

  const nav = document.createElement('div');
  nav.className = 'bottom-navigation';
  nav.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.5rem 0;
    z-index: 1000;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  `;

  const navItems = [
    { icon: '🏠', label: 'Dashboard', href: 'dashboard.html' },
    { icon: '➕', label: 'Add', href: 'add-medicine.html' },
    { icon: '📋', label: 'Orders', href: 'order-list.html' },
    { icon: '📊', label: 'History', href: 'transactions.html' },
    { icon: '⚙️', label: 'More', href: 'notifications-settings.html' }
  ];

  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

  navItems.forEach(item => {
    const link = document.createElement('a');
    link.href = item.href;
    link.className = currentPath === item.href ? 'nav-item active' : 'nav-item';
    link.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: var(--text-secondary);
      padding: 0.5rem;
      min-width: 60px;
      transition: color 0.2s;
    `;
    
    if (currentPath === item.href) {
      link.style.color = 'var(--primary-color)';
    }

    link.innerHTML = `
      <span style="font-size: 1.5rem; margin-bottom: 0.25rem;">${item.icon}</span>
      <span style="font-size: 0.75rem;">${item.label}</span>
    `;

    nav.appendChild(link);
  });

  // Add padding to body to prevent content from being hidden behind nav
  document.body.style.paddingBottom = '70px';

  return nav;
}

// Initialize mobile features
function initMobileFeatures() {
  // Check if mobile
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;

  // Bottom navigation
  const bottomNav = createBottomNavigation();
  if (bottomNav) {
    document.body.appendChild(bottomNav);
  }

  // Pull-to-refresh on dashboard
  if (window.location.pathname.includes('dashboard.html')) {
    const container = document.querySelector('.container');
    if (container) {
      new PullToRefresh(container, async () => {
        // Reload medicines
        if (typeof subscribeToMedicines === 'function') {
          // Force refresh
          window.location.reload();
        }
      });
    }
  }

  // Swipe gestures on table rows
  const tableRows = document.querySelectorAll('.table tbody tr');
  tableRows.forEach(row => {
    new SwipeDetector(row, {
      onSwipeLeft: () => {
        // Show delete button or action
        const actions = row.querySelector('.actions');
        if (actions) {
          actions.style.display = 'flex';
        }
      },
      onSwipeRight: () => {
        // Hide actions
        const actions = row.querySelector('.actions');
        if (actions) {
          actions.style.display = 'none';
        }
      }
    });
  });
}

// Initialize on page load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileFeatures);
  } else {
    initMobileFeatures();
  }

  // Re-initialize on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth <= 768) {
        initMobileFeatures();
      } else {
        // Remove bottom nav on desktop
        const bottomNav = document.querySelector('.bottom-navigation');
        if (bottomNav) {
          bottomNav.remove();
          document.body.style.paddingBottom = '';
        }
      }
    }, 250);
  });
}

