// import { calculateMusinsa, calculate29CM } from './utils/calculator.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSubNavigation();
  initCalculator();
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

// --- MD 대량 마진 & 프로모션 시뮬레이터 로직 ---
const PRODUCTS_DB = [
  { brand: 'connect', styleNo: 'ELD10S010', name: '스트럭처 체크 립 포켓 셔츠', retail: 69000, cost: 16700 },
  { brand: 'connect', styleNo: 'ELD15S010', name: '스티치 플리츠 스트라이프 오픈 카라 셔츠', retail: 89000, cost: 23000 },
  { brand: 'connect', styleNo: 'ELP21S010', name: '썸머 텐셀 세미 와이드 슬랙스', retail: 79000, cost: 19500 },
  { brand: 'connect', styleNo: 'ELJ30S010', name: '미니멀 린넨 블렌드 재킷', retail: 189000, cost: 48000 },
  { brand: 'connect', styleNo: 'ELK12S010', name: '워셔블 케이블 하프 니트 셔츠', retail: 79000, cost: 20000 },
  { brand: 'edinburgh', styleNo: 'LJ301L0M2', name: '울 레귤러 핏 팬츠 (네이비)', retail: 204000, cost: 45000 },
  { brand: 'edinburgh', styleNo: 'LJ302L0M2', name: '울 레귤러 핏 팬츠 (차콜)', retail: 204000, cost: 45000 },
  { brand: 'edinburgh', styleNo: 'LJ353L0M2', name: '가먼트 워싱 세미와이드 면바지', retail: 144000, cost: 32000 },
  { brand: 'edinburgh', styleNo: 'LJ354S2M2', name: '타탄 체크 주름 버뮤다 쇼츠', retail: 154000, cost: 34000 },
  { brand: 'edinburgh', styleNo: 'LJB54C3M2', name: '타탄 체크 코튼 3버튼 스포츠 자켓', retail: 299000, cost: 68000 }
];

const EVENT_PRESETS = {
  regular: {
    brandDiscount: 10,
    extraDiscount: 0,
    couponRate: 0,
    brandShare: 0,
    feeMusinsa: 28,
    feeCm29: 30,
    feeD2c: 3.5
  },
  mujinjang: {
    brandDiscount: 35,
    extraDiscount: 10,
    couponRate: 12,
    brandShare: 50,
    feeMusinsa: 28,
    feeCm29: 30,
    feeD2c: 3.5
  },
  29cm_special: {
    brandDiscount: 25,
    extraDiscount: 15,
    couponRate: 15,
    brandShare: 50,
    feeMusinsa: 28,
    feeCm29: 30,
    feeD2c: 3.5
  },
  d2c_fest: {
    brandDiscount: 20,
    extraDiscount: 5,
    couponRate: 10,
    brandShare: 100,
    feeMusinsa: 28,
    feeCm29: 30,
    feeD2c: 3.5
  }
};

function initCalculator() {
  const elements = {
    eventSelect: document.getElementById('sim-event-select'),
    brandDiscount: document.getElementById('bulk-brand-discount'),
    brandDiscountVal: document.getElementById('bulk-brand-discount-val'),
    extraDiscount: document.getElementById('bulk-extra-discount'),
    extraDiscountVal: document.getElementById('bulk-extra-discount-val'),
    couponRate: document.getElementById('bulk-coupon-rate'),
    couponRateVal: document.getElementById('bulk-coupon-rate-val'),
    brandShare: document.getElementById('bulk-brand-share'),
    brandShareVal: document.getElementById('bulk-brand-share-val'),
    shippingCost: document.getElementById('bulk-shipping-cost'),
    packagingCost: document.getElementById('bulk-packaging-cost'),
    targetQty: document.getElementById('bulk-target-qty'),
    feeMusinsa: document.getElementById('fee-musinsa'),
    feeCm29: document.getElementById('fee-cm29'),
    feeD2c: document.getElementById('fee-d2c'),
    tableBody: document.querySelector('#bulk-simulation-table tbody'),
    kpiRevenue: document.getElementById('bulk-total-revenue'),
    kpiProfit: document.getElementById('bulk-total-profit'),
    kpiMarginRate: document.getElementById('bulk-avg-margin-rate'),
    filterBrandBtns: document.querySelectorAll('[data-filter-brand]'),
    filterPlatformBtns: document.querySelectorAll('[data-filter-platform]')
  };

  if (!elements.eventSelect) return;

  let activeBrand = 'all';
  let activePlatform = 'all';

  window.bulkMarginChartInstance = null;
  window.bulkCostBreakdownChartInstance = null;

  // Event Preset Change Listener
  elements.eventSelect.addEventListener('change', (e) => {
    const preset = EVENT_PRESETS[e.target.value];
    if (preset) {
      elements.brandDiscount.value = preset.brandDiscount;
      elements.extraDiscount.value = preset.extraDiscount;
      elements.couponRate.value = preset.couponRate;
      elements.brandShare.value = preset.brandShare;
      elements.feeMusinsa.value = preset.feeMusinsa;
      elements.feeCm29.value = preset.feeCm29;
      elements.feeD2c.value = preset.feeD2c;
      updateCalculations();
    }
  });

  // Attach input listeners
  const inputList = [
    elements.brandDiscount, elements.extraDiscount, elements.couponRate, elements.brandShare,
    elements.shippingCost, elements.packagingCost, elements.targetQty,
    elements.feeMusinsa, elements.feeCm29, elements.feeD2c
  ];
  inputList.forEach(input => {
    input.addEventListener('input', updateCalculations);
  });

  // Attach Filter Listeners
  elements.filterBrandBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.filterBrandBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#6b7280';
        b.style.fontWeight = 'normal';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.08)';
      btn.style.color = 'white';
      btn.style.fontWeight = '600';
      activeBrand = btn.getAttribute('data-filter-brand');
      updateCalculations();
    });
  });

  elements.filterPlatformBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.filterPlatformBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#6b7280';
        b.style.fontWeight = 'normal';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.08)';
      btn.style.color = 'white';
      btn.style.fontWeight = '600';
      activePlatform = btn.getAttribute('data-filter-platform');
      updateCalculations();
    });
  });

  function calculatePlatformSpecs(product, platform, params) {
    const normalPrice = product.retail;
    const rawCost = product.cost;
    
    const brandDiscountPct = params.brandDiscount / 100;
    const extraDiscountPct = params.extraDiscount / 100;
    const salePrice = normalPrice * (1 - brandDiscountPct) * (1 - extraDiscountPct);
    
    const couponRatePct = params.couponRate / 100;
    const couponDiscount = salePrice * couponRatePct;
    
    const customerPrice = Math.max(0, salePrice - couponDiscount);
    
    let feePct = 0;
    if (platform === 'musinsa') feePct = params.feeMusinsa;
    else if (platform === 'cm29') feePct = params.feeCm29;
    else if (platform === 'd2c') feePct = params.feeD2c;
    
    const commissionFee = customerPrice * (feePct / 100);
    
    // For D2C, coupon brand share is always 100% since brand owns D2C
    const realBrandShare = platform === 'd2c' ? 100 : params.brandShare;
    const brandCouponShare = couponDiscount * (realBrandShare / 100);
    
    const settlementNet = Math.max(0, customerPrice - commissionFee - brandCouponShare) / 1.1;
    
    const costNet = rawCost / 1.1;
    const shippingNet = params.shippingCost / 1.1;
    const packagingNet = params.packagingCost / 1.1;
    const totalCostNet = costNet + shippingNet + packagingNet;
    
    const expectedProfit = settlementNet - totalCostNet;
    const marginRate = customerPrice > 0 ? (expectedProfit / (customerPrice / 1.1)) * 100 : 0;
    
    return {
      normalPrice,
      rawCost,
      salePrice,
      couponDiscount,
      customerPrice,
      commissionFee,
      brandCouponShare,
      settlementNet,
      totalCostNet,
      expectedProfit,
      marginRate
    };
  }

  function updateCalculations() {
    const params = {
      brandDiscount: parseFloat(elements.brandDiscount.value) || 0,
      extraDiscount: parseFloat(elements.extraDiscount.value) || 0,
      couponRate: parseFloat(elements.couponRate.value) || 0,
      brandShare: parseFloat(elements.brandShare.value) || 0,
      shippingCost: parseFloat(elements.shippingCost.value) || 0,
      packagingCost: parseFloat(elements.packagingCost.value) || 0,
      targetQty: parseFloat(elements.targetQty.value) || 0,
      feeMusinsa: parseFloat(elements.feeMusinsa.value) || 0,
      feeCm29: parseFloat(elements.feeCm29.value) || 0,
      feeD2c: parseFloat(elements.feeD2c.value) || 0
    };

    // Update value labels
    elements.brandDiscountVal.textContent = `${params.brandDiscount}%`;
    elements.extraDiscountVal.textContent = `${params.extraDiscount}%`;
    elements.couponRateVal.textContent = `${params.couponRate}%`;
    elements.brandShareVal.textContent = `${params.brandShare}%`;

    // Filter products
    const filteredProducts = PRODUCTS_DB.filter(p => {
      if (activeBrand === 'all') return true;
      return p.brand === activeBrand;
    });

    elements.tableBody.innerHTML = '';
    
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalRevenueNet = 0;

    // Sum costs for doughnut chart
    let sumCostNet = 0;
    let sumCommissionFeeNet = 0;
    let sumCouponShareNet = 0;
    let sumShippingPkgNet = 0;
    let sumVat = 0;
    let sumNetProfit = 0;

    const chartLabels = [];
    const chartMargins = [];
    const chartColors = [];

    const fmt = (num) => Math.round(num).toLocaleString('ko-KR');

    filteredProducts.forEach(product => {
      let calc = null;
      if (activePlatform === 'all') {
        const m = calculatePlatformSpecs(product, 'musinsa', params);
        const c = calculatePlatformSpecs(product, 'cm29', params);
        const d = calculatePlatformSpecs(product, 'd2c', params);
        
        // Blend weighted: Musinsa 50%, 29CM 35%, D2C 15%
        calc = {
          normalPrice: product.retail,
          rawCost: product.cost,
          salePrice: m.salePrice * 0.5 + c.salePrice * 0.35 + d.salePrice * 0.15,
          couponDiscount: m.couponDiscount * 0.5 + c.couponDiscount * 0.35 + d.couponDiscount * 0.15,
          customerPrice: m.customerPrice * 0.5 + c.customerPrice * 0.35 + d.customerPrice * 0.15,
          commissionFee: m.commissionFee * 0.5 + c.commissionFee * 0.35 + d.commissionFee * 0.15,
          brandCouponShare: m.brandCouponShare * 0.5 + c.brandCouponShare * 0.35 + d.brandCouponShare * 0.15,
          settlementNet: m.settlementNet * 0.5 + c.settlementNet * 0.35 + d.settlementNet * 0.15,
          totalCostNet: m.totalCostNet * 0.5 + c.totalCostNet * 0.35 + d.totalCostNet * 0.15,
          expectedProfit: m.expectedProfit * 0.5 + c.expectedProfit * 0.35 + d.expectedProfit * 0.15,
          marginRate: m.marginRate * 0.5 + c.marginRate * 0.35 + d.marginRate * 0.15
        };
      } else {
        calc = calculatePlatformSpecs(product, activePlatform, params);
      }

      // Add to aggregate values
      const revenue = calc.customerPrice * params.targetQty;
      const profit = calc.expectedProfit * params.targetQty;
      totalRevenue += revenue;
      totalProfit += profit;
      totalRevenueNet += (calc.customerPrice / 1.1) * params.targetQty;

      // Accumulate costs for doughnut chart
      sumCostNet += (product.cost / 1.1) * params.targetQty;
      sumCommissionFeeNet += (calc.commissionFee / 1.1) * params.targetQty;
      sumCouponShareNet += (calc.brandCouponShare / 1.1) * params.targetQty;
      sumShippingPkgNet += ((params.shippingCost + params.packagingCost) / 1.1) * params.targetQty;
      sumVat += (calc.customerPrice - (calc.customerPrice / 1.1)) * params.targetQty;
      sumNetProfit += profit;

      chartLabels.push(product.styleNo);
      chartMargins.push(Math.round(calc.marginRate * 10) / 10);
      chartColors.push(calc.marginRate < 0 ? '#ef4444' : '#10b981');

      // Append row to table
      const brandName = product.brand === 'connect' ? '커넥트킨록' : '에든버러클럽';
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
      
      const marginColor = calc.marginRate < 0 ? '#f87171' : '#10b981';

      tr.innerHTML = `
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); color:#888;">${brandName}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); font-family:monospace; color:#aaa;">${product.styleNo}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); font-weight:500; color:#fff;" title="${product.name}">${product.name}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); text-align:right;">${fmt(calc.normalPrice)}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); text-align:right;">${fmt(calc.rawCost)}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); text-align:right; font-weight:600; color:#fff;">${fmt(calc.salePrice)}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); text-align:right; color:#f43f5e;">${fmt(calc.couponDiscount)}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); text-align:right; color:#a78bfa;">${fmt(calc.commissionFee)}</td>
        <td style="padding:8px; border-right:1px solid rgba(255,255,255,0.03); text-align:right; font-weight:600; color:#fff;">${fmt(calc.expectedProfit)}</td>
        <td style="padding:8px; text-align:right; font-weight:600; color:${marginColor};">${calc.marginRate.toFixed(1)}%</td>
      `;
      elements.tableBody.appendChild(tr);
    });

    // Update KPI panels
    elements.kpiRevenue.textContent = `₩${fmt(totalRevenue)}`;
    elements.kpiProfit.textContent = `₩${fmt(totalProfit)}`;
    const avgMarginRate = totalRevenueNet > 0 ? (totalProfit / totalRevenueNet) * 100 : 0;
    elements.kpiMarginRate.textContent = `${avgMarginRate.toFixed(1)}%`;
    elements.kpiMarginRate.style.color = avgMarginRate < 0 ? '#f87171' : '#10b981';
    elements.kpiProfit.style.color = totalProfit < 0 ? '#f87171' : '#10b981';

    // Update Margin Chart
    const ctxMargin = document.getElementById('bulkMarginChart');
    if (ctxMargin) {
      if (window.bulkMarginChartInstance) window.bulkMarginChartInstance.destroy();
      window.bulkMarginChartInstance = new Chart(ctxMargin, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: '마진율 (%)',
            data: chartMargins,
            backgroundColor: chartColors,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { 
              grid: { color: 'rgba(255,255,255,0.04)' },
              ticks: { color: '#888', font: { size: 9 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#ccc', font: { size: 9 } }
            }
          }
        }
      });
    }

    // Update Cost Breakdown Chart
    const ctxCost = document.getElementById('bulkCostBreakdownChart');
    if (ctxCost) {
      if (window.bulkCostBreakdownChartInstance) window.bulkCostBreakdownChartInstance.destroy();
      
      const totalSlices = sumCostNet + sumCommissionFeeNet + sumCouponShareNet + sumShippingPkgNet + sumVat + sumNetProfit;
      const getPct = (val) => totalSlices > 0 ? (val / totalSlices * 100).toFixed(1) + '%' : '0%';

      window.bulkCostBreakdownChartInstance = new Chart(ctxCost, {
        type: 'doughnut',
        data: {
          labels: ['제조원가(세전)', '유통수수료', '쿠폰분담금', '배송/기타비용', '부가세(10%)', '브랜드 순이익'],
          datasets: [{
            data: [
              Math.max(0, sumCostNet),
              Math.max(0, sumCommissionFeeNet),
              Math.max(0, sumCouponShareNet),
              Math.max(0, sumShippingPkgNet),
              Math.max(0, sumVat),
              Math.max(0, sumNetProfit)
            ],
            backgroundColor: ['#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#6b7280', '#10b981'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#aaa',
                boxWidth: 8,
                font: { size: 8 }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.raw;
                  return `${context.label}: ₩${fmt(val)} (${getPct(val)})`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // Initial calculation run
  updateCalculations();
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
