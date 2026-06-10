// import { calculateMusinsa, calculate29CM } from './utils/calculator.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSubNavigation();
  initCalculator();
  initBannerSimulator();
  initMockChart();
  
  // 클로드코드가 띄울 FastAPI 백엔드 연동 시작
  connectToBackend();
});

// --- API Integration (Claude Code Backend) ---
async function connectToBackend() {
  console.log("백엔드(8080 포트) 연결 시도 중...");
  
  // 1. 모니터링 데이터
  try {
    const res = await fetch('https://raw.githubusercontent.com/adidas2062-coder/fashion-md-simulator/main/data/json/monitoring.json?_t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      const w = json.data.weather;
      
      // 날씨 업데이트
      const tempEl = document.querySelector('.weather-info .temp');
      const descEl = document.querySelector('.weather-info .weather-desc');
      if(tempEl) tempEl.textContent = `${w.current_temp}°C`;
      if(descEl) descEl.textContent = `체감 ${w.apparent_temp}°C / ${w.weather_label} / 최고 ${w.temp_max}°C`;
      
      // 수요 시그널 업데이트
      const sigContainer = document.querySelector('.demand-signal');
      if(sigContainer && w.category_signal) {
        sigContainer.innerHTML = '<span>수요 시그널:</span>';
        for (const [cat, sig] of Object.entries(w.category_signal)) {
          const badge = document.createElement('span');
          badge.className = sig.includes('↑') ? 'badge accent' : 'badge';
          badge.textContent = `${cat}: ${sig}`;
          sigContainer.appendChild(badge);
        }
      }
      
      // 타이밍 시그널 업데이트
      const signalListContainer = document.getElementById('timing-signals-container');
      if (signalListContainer && json.data.signals) {
        signalListContainer.innerHTML = '';
        if (json.data.signals.length === 0) {
          signalListContainer.innerHTML = '<div style="color:#aaa; font-size:0.9rem; padding:10px;">현재 감지된 기획전 시그널이 없습니다.</div>';
        } else {
          json.data.signals.slice(0,3).forEach(sig => {
            signalListContainer.innerHTML += `
              <div class="signal-item">
                <div class="signal-header">
                  <span class="signal-name">🟢 ${sig.theme || '기획전'}</span>
                  <span class="score">${sig.score || 0}점</span>
                </div>
                <div class="signal-meta">${sig.reason || ''}</div>
              </div>`;
          });
        }
      }

      // 무신사 실시간 랭킹 업데이트
      const rankingListContainer = document.getElementById('realtime-ranking-container');
      if (rankingListContainer && json.data.rankings && json.data.rankings.tops) {
        rankingListContainer.innerHTML = '';
        json.data.rankings.tops.slice(0, 5).forEach(item => {
          rankingListContainer.innerHTML += `
            <li>
              <span class="rank">${item.rank}</span> 
              <span class="badge" style="background:rgba(255,255,255,0.1); border-radius:4px; padding:2px 6px; font-size:10px;">${item.rank_change || '-'}</span> 
              [${item.brand}] ${item.product_name}
            </li>`;
        });
      }

      console.log("✅ 모니터링 데이터 바인딩 완료");
    } else {
      console.error("모니터링 API 에러 응답:", res.status);
    }
  } catch (e) {
    console.error("모니터링 API 호출 실패", e);
  }

  // 2. 세일즈 데이터 (실데이터 연동)
  try {
    const res = await fetch('https://raw.githubusercontent.com/adidas2062-coder/fashion-md-simulator/main/data/json/sales_real.json?_t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      window.salesData = json.data;
      
      const sum = json.data.total;
      const fmt = (n) => Number(n).toLocaleString('ko-KR');
      
      // KPI 업데이트
      const elRev = document.getElementById('kpi-revenue');
      const elRevTrend = document.getElementById('kpi-revenue-trend');
      const elOrders = document.getElementById('kpi-orders');
      const elAov = document.getElementById('kpi-aov');

      if(elRev) elRev.textContent = `₩${fmt(sum.today_revenue)}`;
      if(elRevTrend) {
        elRevTrend.textContent = `${sum.revenue_change_pct > 0 ? '+' : ''}${sum.revenue_change_pct}% vs 어제`;
        elRevTrend.className = `trend ${sum.revenue_change_pct > 0 ? 'up' : 'down'}`;
      }
      if(elOrders) elOrders.textContent = `${fmt(sum.today_orders)}`;
      if(elAov) elAov.textContent = `₩${fmt(Math.round(sum.today_revenue / (sum.today_orders || 1)))}`;

      // 차트 객체 저장용
      window.salesChartInstance = null;

      window.renderSales = function(brandKey) {
        const d = window.salesData;
        const labels = d.dates.slice(-14).map(x => x.substring(5));
        
        let ds = [];
        let rows = [];
        
        if(brandKey === 'total') {
            ds = [{
                label: '총 매출(원)',
                data: d.total.daily_revenue.slice(-14),
                borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4, borderWidth: 2, fill: true
            }];
            for(let i=0; i<14; i++) {
                const idx = d.dates.length - 14 + i;
                const m_c = d.connect.musinsa_revenue[idx] + d.edinburgh.musinsa_revenue[idx];
                const c_c = d.connect.cm29_revenue[idx] + d.edinburgh.cm29_revenue[idx];
                const g_c = d.connect.global_revenue[idx] + d.edinburgh.global_revenue[idx];
                rows.push({ date: d.dates[idx], tot: d.total.daily_revenue[idx], m: m_c, c: c_c, g: g_c });
            }
        } else {
            const b = d[brandKey];
            ds = [
                { label: '무신사', data: b.musinsa_revenue.slice(-14), borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
                { label: '29CM', data: b.cm29_revenue.slice(-14), borderColor: '#f43f5e', backgroundColor: '#f43f5e' },
                { label: '글로벌', data: b.global_revenue.slice(-14), borderColor: '#8b5cf6', backgroundColor: '#8b5cf6' }
            ];
            for(let i=0; i<14; i++) {
                const idx = d.dates.length - 14 + i;
                const m = b.musinsa_revenue[idx];
                const c = b.cm29_revenue[idx];
                const g = b.global_revenue[idx];
                rows.push({ date: d.dates[idx], tot: m+c+g, m: m, c: c, g: g });
            }
        }
        
        // 차트 업데이트
        const ctx = document.getElementById('salesChart');
        if(window.salesChartInstance) window.salesChartInstance.destroy();
        window.salesChartInstance = new Chart(ctx, {
            type: brandKey === 'total' ? 'line' : 'bar',
            data: { labels: labels, datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' }, stacked: brandKey !== 'total' },
                    x: { grid: { display: false }, ticks: { color: '#9ca3af' }, stacked: brandKey !== 'total' }
                },
                plugins: { legend: { labels: { color: '#e5e7eb' } } }
            }
        });
        
        // 테이블 업데이트
        const tbody = document.querySelector('#sales-detail-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            rows.reverse().forEach(r => {
                tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 10px;">${r.date}</td>
                  <td style="padding: 10px; font-weight:600; color:#fff;">₩${fmt(r.tot)}</td>
                  <td style="padding: 10px;">₩${fmt(r.m)}</td>
                  <td style="padding: 10px;">₩${fmt(r.c)}</td>
                  <td style="padding: 10px;">₩${fmt(r.g)}</td>
                </tr>`;
            });
        }
      }

      window.renderSales('total');
      
      // 탭 이벤트 연동
      document.querySelectorAll('.brand-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              document.querySelectorAll('.brand-btn').forEach(b => {
                  b.classList.remove('active');
                  b.style.background = 'transparent';
                  b.style.color = '#9ca3af';
              });
              e.target.classList.add('active');
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.color = 'white';
              window.renderSales(e.target.dataset.brand);
          });
      });
      
    }
  } catch (e) {
    console.error("세일즈 API 호출 실패", e);
  }

  // 3. 기획전(이벤트) 데이터
  try {
    const res = await fetch('https://raw.githubusercontent.com/adidas2062-coder/fashion-md-simulator/main/data/json/events.json?_t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      const events = json.data;
      
      // KPI: 프로모션 수 업데이트
      const kpiPromo = document.getElementById('kpi-promo');
      if (kpiPromo) kpiPromo.textContent = json.count || events.length;

      // 행사 일정 리스트 업데이트
      const listContainer = document.querySelector('#sales-schedule .ranking-list');
      if(listContainer && events.length > 0) {
        listContainer.innerHTML = '';
        events.slice(0, 5).forEach(ev => {
          const li = document.createElement('li');
          const platformTag = ev.platform === '29cm' ? '<strong style="color:var(--cm-accent)">[29CM]</strong>' : '<strong style="color:var(--ms-accent)">[무신사]</strong>';
          li.innerHTML = `${platformTag} ${ev.title} <span style="font-size:0.85rem; color:#aaa; margin-left:10px;">(${ev.period})</span>`;
          listContainer.appendChild(li);
        });
      }

      // 행사 상세 카드 업데이트 (동적)
      const infoContainer = document.getElementById('event-info-container');
      if (infoContainer && events.length > 0) {
        infoContainer.innerHTML = '';
        events.slice(0, 4).forEach(ev => {
          let itemsHtml = '';
          if (ev.top_items && ev.top_items.length > 0) {
            itemsHtml = '<ul style="margin-top:10px; padding-left:20px; font-size:0.85rem; color:#ccc;">';
            ev.top_items.slice(0, 2).forEach(item => {
              itemsHtml += `<li>[${item.brand}] ${item.product_name} (${item.discount_rate}%↓)</li>`;
            });
            itemsHtml += '</ul>';
          }

          infoContainer.innerHTML += `
            <div class="card glass-card">
              <div class="card-title" style="font-size:1rem;">${ev.title}</div>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.5;">
                <strong>플랫폼:</strong> ${ev.platform === '29cm' ? '<span style="color:var(--cm-accent)">29CM</span>' : '<span style="color:var(--ms-accent)">무신사</span>'}<br>
                <strong>기간:</strong> ${ev.period}<br>
                <strong>참여 상품수:</strong> ${ev.item_count}종
              </p>
              ${itemsHtml}
            </div>
          `;
        });
      }
      console.log("✅ 기획전 데이터 바인딩 완료");
    }
  } catch (e) {
    console.warn("이벤트 API 호출 실패", e);
  }
}

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
