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
    const res = await fetch('http://localhost:8080/api/monitoring?_t=' + Date.now());
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

  // 2. 세일즈 데이터
  try {
    const res = await fetch('http://localhost:8080/api/sales?_t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      // KPI 업데이트
      const fmt = (n) => Number(n).toLocaleString('ko-KR');
      
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
      if(elAov) elAov.textContent = `₩${fmt(sum.avg_order_value)}`;
      
      // 매출 상세 테이블 (최근 14일 역순)
      const tableBody = document.querySelector('#sales-detail-table tbody');
      if (tableBody && json.data.daily) {
        tableBody.innerHTML = '';
        const recentRows = [...json.data.daily].slice(-14).reverse();
        recentRows.forEach(row => {
          tableBody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px;">${row.date}</td>
              <td style="padding: 10px; font-weight:600; color:#fff;">₩${fmt(row.revenue)}</td>
              <td style="padding: 10px;">${fmt(row.orders)}건</td>
              <td style="padding: 10px;">₩${fmt(row.avg_order_value)}</td>
              <td style="padding: 10px; color:${row.return_rate > 5 ? '#f87171' : '#34d399'};">${row.return_rate}%</td>
            </tr>
          `;
        });
      }
      
      // 매출 현황 차트 렌더링
      const ctx = document.getElementById('salesChart');
      if (ctx && json.data.daily) {
        const dailyData = json.data.daily.slice(-14); // 최근 14일
        const labels = dailyData.map(d => d.date.substring(5)); // MM-DD
        const revenues = dailyData.map(d => d.revenue);
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: '일별 매출(원)',
              data: revenues,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              borderWidth: 2,
              fill: true
            }]
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

      console.log("✅ 세일즈 데이터 바인딩 완료");
    }
  } catch (e) {
    console.warn("세일즈 API 호출 실패", e);
  }

  // 3. 기획전(이벤트) 데이터
  try {
    const res = await fetch('http://localhost:8080/api/events?_t=' + Date.now());
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
