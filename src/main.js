// import { calculateMusinsa, calculate29CM } from './utils/calculator.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSubNavigation();
  initCalculator();
  initBannerSimulator();
  initMockChart();
});

// --- Navigation Logic (Main Tabs) ---
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Deactivate all
      navItems.forEach(nav => nav.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));

      // Activate selected
      item.classList.add('active');
      const targetId = item.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// --- Sub Navigation Logic (Tab 2: Sales & Promotions) ---
function initSubNavigation() {
  const subNavItems = document.querySelectorAll('.sub-nav-item');
  const subTabContents = document.querySelectorAll('.sub-tab-content');

  subNavItems.forEach(item => {
    item.addEventListener('click', () => {
      // Deactivate all
      subNavItems.forEach(nav => nav.classList.remove('active'));
      subTabContents.forEach(tab => tab.classList.remove('active'));

      // Activate selected
      item.classList.add('active');
      const targetId = item.getAttribute('data-sub');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// --- Margin Calculator Logic (Tab 3) ---
function initCalculator() {
  const elements = {
    platformBtns: document.querySelectorAll('#tab-simulator .platform-btn'),
    inputs: {
      retail: document.getElementById('retail-price'),
      cost: document.getElementById('cost-price'),
      directDiscount: document.getElementById('direct-discount'),
      commRate: document.getElementById('comm-rate'),
    },
    outputs: {
      selling: document.getElementById('res-selling-price'),
      settlement: document.getElementById('res-settlement-price'),
      netMargin: document.getElementById('res-net-margin'),
      marginRate: document.getElementById('res-margin-rate'),
      directVal: document.getElementById('direct-discount-val'),
      commVal: document.getElementById('comm-rate-val'),
    }
  };

  let currentPlatform = 'musinsa';

  // Platform Toggle
  elements.platformBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.platformBtns.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      currentPlatform = targetBtn.getAttribute('data-platform');
      
      // Update defaults based on platform
      if(currentPlatform === 'musinsa') {
        elements.inputs.commRate.value = 28;
      } else if (currentPlatform === '29cm') {
        elements.inputs.commRate.value = 30;
      }
      updateCalculations();
      updateBannerPreviewPlatform(currentPlatform);
    });
  });

  // Attach input events
  Object.values(elements.inputs).forEach(input => {
    input.addEventListener('input', updateCalculations);
  });

  function updateCalculations() {
    const retail = parseFloat(elements.inputs.retail.value) || 0;
    const cost = parseFloat(elements.inputs.cost.value) || 0;
    const directDiscountRate = parseFloat(elements.inputs.directDiscount.value) || 0;
    const commRate = parseFloat(elements.inputs.commRate.value) || 0;

    // Update slider labels
    elements.outputs.directVal.textContent = `${directDiscountRate}%`;
    elements.outputs.commVal.textContent = `${commRate}%`;

    // Perform calculation
    const sellingPrice = retail * (1 - (directDiscountRate / 100));
    const commission = sellingPrice * (commRate / 100);
    const settlement = sellingPrice - commission;
    const netMargin = settlement - cost;
    const marginRate = sellingPrice > 0 ? (netMargin / sellingPrice) * 100 : 0;

    // Format output
    const fmt = (num) => Math.round(num).toLocaleString('ko-KR');
    
    elements.outputs.selling.textContent = `${fmt(sellingPrice)} 원`;
    elements.outputs.settlement.textContent = `${fmt(settlement)} 원`;
    elements.outputs.netMargin.textContent = `${fmt(netMargin)} 원`;
    elements.outputs.marginRate.textContent = `${marginRate.toFixed(1)} %`;
    
    // Update color for margin rate
    elements.outputs.marginRate.style.color = marginRate < 0 ? '#f87171' : '#10b981';
    elements.outputs.netMargin.style.color = marginRate < 0 ? '#f87171' : '#10b981';
  }

  // Initial calculation
  updateCalculations();
}

// --- Banner Simulator Logic (Tab 3) ---
function initBannerSimulator() {
  const inputs = {
    brand: document.getElementById('prod-brand'),
    title: document.getElementById('sim-title'),
    directDiscount: document.getElementById('direct-discount'),
  };

  const previewElements = {
    msBrand: document.getElementById('preview-ms-brand'),
    msTitle: document.getElementById('preview-ms-title'),
    msBadge: document.getElementById('preview-ms-badge'),
    cmBrand: document.getElementById('preview-cm-brand'),
    cmTitle: document.getElementById('preview-cm-title'),
    cmBadge: document.getElementById('preview-cm-badge'),
  };

  function updatePreviewText() {
    const brand = inputs.brand.value;
    const title = inputs.title.value;
    const discount = inputs.directDiscount.value;
    const badgeText = `UP TO ${discount}%`;

    if (previewElements.msBrand) previewElements.msBrand.textContent = brand;
    if (previewElements.msTitle) previewElements.msTitle.textContent = title;
    if (previewElements.msBadge) previewElements.msBadge.textContent = badgeText;
    
    if (previewElements.cmBrand) previewElements.cmBrand.textContent = brand;
    if (previewElements.cmTitle) previewElements.cmTitle.textContent = title;
    if (previewElements.cmBadge) previewElements.cmBadge.textContent = `SPECIAL ORDER ${badgeText}`;
  }

  Object.values(inputs).forEach(input => {
    input.addEventListener('input', updatePreviewText);
  });
  
  // AI Image generation mock call
  const btnGen = document.getElementById('btn-generate-image');
  if(btnGen) {
    btnGen.addEventListener('click', async () => {
      const originalText = btnGen.innerHTML;
      btnGen.innerHTML = '<span class="spinner"></span> <span>AI 생성 중...</span>';
      
      try {
        await fetch(`/api/generate-request?prompt=fashion banner for ${inputs.title.value}`);
        // Simulate waiting
        setTimeout(() => {
          btnGen.innerHTML = '<span>✅ 이미지 생성 완료 (터미널 확인)</span>';
          setTimeout(() => { btnGen.innerHTML = originalText; }, 3000);
        }, 1500);
      } catch (e) {
        btnGen.innerHTML = originalText;
      }
    });
  }

  updatePreviewText();
}

// Helper to switch phone simulator theme
function updateBannerPreviewPlatform(platform) {
  const screen = document.getElementById('phone-screen-target');
  const msStruct = document.getElementById('preview-musinsa-structure');
  const cmStruct = document.getElementById('preview-29cm-structure');
  
  if (platform === 'musinsa') {
    screen.className = 'phone-screen theme-musinsa';
    msStruct.style.display = 'block';
    cmStruct.style.display = 'none';
  } else {
    screen.className = 'phone-screen theme-29cm';
    msStruct.style.display = 'none';
    cmStruct.style.display = 'block';
  }
}

// --- Mock Chart for Tab 1 ---
function initMockChart() {
  const ctx = document.getElementById('trendChartMock');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: '린넨 셔츠',
          data: [40, 50, 45, 60, 75, 80, 95],
          borderColor: '#3b82f6',
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: '바람막이',
          data: [80, 70, 65, 55, 45, 40, 35],
          borderColor: '#10b981',
          tension: 0.4,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
      }
    }
  });
}
