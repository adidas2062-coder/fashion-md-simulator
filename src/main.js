import { calculateMusinsa, calculate29CM, suggestSellingPrice } from './utils/calculator.js';

// 1. 상태 관리
let currentPlatform = 'musinsa'; // 'musinsa' | '29cm'
let simulatorTheme = 'musinsa'; // 'musinsa' | '29cm'
let marginChart = null;
let isGeneratingImage = false;

// 2. DOM 요소 매핑
const el = {
  // 플랫폼 버튼
  platformBtns: document.querySelectorAll('.platform-btn[data-platform]'),
  simulatorBtns: document.querySelectorAll('.platform-btn[data-simulator-theme]'),
  musinsaOnlyFields: document.getElementById('musinsa-only-fields'),
  
  // 입력 필드들
  prodBrand: document.getElementById('prod-brand'),
  prodName: document.getElementById('prod-name'),
  retailPrice: document.getElementById('retail-price'),
  costPrice: document.getElementById('cost-price'),
  
  // 슬라이더들
  directDiscount: document.getElementById('direct-discount'),
  commRate: document.getElementById('comm-rate'),
  couponRate: document.getElementById('coupon-rate'),
  couponShare: document.getElementById('coupon-share'),
  memberDiscount: document.getElementById('member-discount'),
  memberShare: document.getElementById('member-share'),
  
  // 슬라이더 값 텍스트
  directDiscountVal: document.getElementById('direct-discount-val'),
  commRateVal: document.getElementById('comm-rate-val'),
  couponRateVal: document.getElementById('coupon-rate-val'),
  couponShareVal: document.getElementById('coupon-share-val'),
  memberDiscountVal: document.getElementById('member-discount-val'),
  memberShareVal: document.getElementById('member-share-val'),

  // 역산 설정
  targetMarginRate: document.getElementById('target-margin-rate'),
  recommendPrice: document.getElementById('recommend-price'),
  recommendDesc: document.getElementById('recommend-desc'),

  // 리포트 출력 필드
  resSellingPrice: document.getElementById('res-selling-price'),
  resSettlementPrice: document.getElementById('res-settlement-price'),
  resNetMargin: document.getElementById('res-net-margin'),
  resMarginRate: document.getElementById('res-margin-rate'),

  // 비교 섹션
  compMsSettle: document.getElementById('comp-ms-settle'),
  compMsRate: document.getElementById('comp-ms-rate'),
  compCmSettle: document.getElementById('comp-cm-settle'),
  compCmRate: document.getElementById('comp-cm-rate'),
  compMsBar: document.getElementById('comp-ms-bar'),
  compCmBar: document.getElementById('comp-cm-bar'),
  compMsBarLabel: document.getElementById('comp-ms-bar-label'),
  compCmBarLabel: document.getElementById('comp-cm-bar-label'),

  // 상세 명세 테이블 행들
  detRetail: document.getElementById('det-retail'),
  detDirect: document.getElementById('det-direct'),
  detSelling: document.getElementById('det-selling'),
  detCoupon: document.getElementById('det-coupon'),
  detMember: document.getElementById('det-member'),
  detCommission: document.getElementById('det-commission'),
  detBrandShare: document.getElementById('det-brand-share'),
  detSettlement: document.getElementById('det-settlement'),
  detCost: document.getElementById('det-cost'),
  detMargin: document.getElementById('det-margin'),
  msDetailRow: document.querySelector('.ms-detail-row'),

  // 탭 네비게이션
  navItems: document.querySelectorAll('.nav-item'),
  tabContents: document.querySelectorAll('.tab-content'),

  // 시뮬레이터 입력 필드
  simBrand: document.getElementById('sim-brand'),
  simBadge: document.getElementById('sim-badge'),
  simTitle: document.getElementById('sim-title'),
  simSubtitle: document.getElementById('sim-subtitle'),
  simPrompt: document.getElementById('sim-prompt'),
  btnGenerateImage: document.getElementById('btn-generate-image'),

  // 모바일 프리뷰 타겟
  phoneScreenTarget: document.getElementById('phone-screen-target'),
  previewMusinsaStructure: document.getElementById('preview-musinsa-structure'),
  preview29cmStructure: document.getElementById('preview-29cm-structure'),

  // 모바일 내부 텍스트 노드
  previewMsBrand: document.getElementById('preview-ms-brand'),
  previewMsTitle: document.getElementById('preview-ms-title'),
  previewMsSubtitle: document.getElementById('preview-ms-subtitle'),
  previewMsBadge: document.getElementById('preview-ms-badge'),
  
  previewCmBrand: document.getElementById('preview-cm-brand'),
  previewCmTitle: document.getElementById('preview-cm-title'),
  previewCmSubtitle: document.getElementById('preview-cm-subtitle'),
  previewCmBadge: document.getElementById('preview-cm-badge'),

  // 배너 이미지 배경
  musinsaBannerBg: document.getElementById('musinsa-banner-bg'),
  musinsaProdImg1: document.getElementById('musinsa-prod-img-1'),
  cmBannerBg: document.getElementById('29cm-banner-bg'),
};

// 3. 포맷터 (원화 3자리 쉼표)
function formatKRW(val) {
  return new Intl.NumberFormat('ko-KR').format(val) + ' 원';
}

// 4. 메인 마진 계산 및 리포트 갱신
function updateCalculations() {
  const retail = Number(el.retailPrice.value) || 0;
  const cost = Number(el.costPrice.value) || 0;
  const directDisc = Number(el.directDiscount.value);
  const comm = Number(el.commRate.value);
  const coupon = Number(el.couponRate.value);
  const couponShare = Number(el.couponShare.value);
  const member = Number(el.memberDiscount.value);
  const memberShare = Number(el.memberShare.value);
  const targetMargin = Number(el.targetMarginRate.value) || 0;

  // 무신사 & 29CM 결과 각각 계산 (비교용)
  const msResult = calculateMusinsa({
    retailPrice: retail,
    directDiscountRate: directDisc,
    cost: cost,
    commissionRate: currentPlatform === 'musinsa' ? comm : 28, // 선택한 값 혹은 기본값
    couponRate: coupon,
    couponBrandShare: couponShare,
    memberDiscountRate: member,
    memberBrandShare: memberShare,
  });

  const cmResult = calculate29CM({
    retailPrice: retail,
    directDiscountRate: directDisc,
    cost: cost,
    commissionRate: currentPlatform === '29cm' ? comm : 30,
    couponRate: coupon,
    couponBrandShare: couponShare,
  });

  // 현재 활성화된 플랫폼 결과 추출
  const activeResult = currentPlatform === 'musinsa' ? msResult : cmResult;

  // UI 요약 카드 업데이트
  el.resSellingPrice.textContent = formatKRW(activeResult.sellingPrice);
  el.resSettlementPrice.textContent = formatKRW(activeResult.settlementAmount);
  el.resNetMargin.textContent = formatKRW(activeResult.netMarginAmount);
  el.resMarginRate.textContent = activeResult.marginOnSellingPrice.toFixed(1) + ' %';

  // 비교 섹션 카드 및 바 그래프 업데이트
  el.compMsSettle.textContent = formatKRW(msResult.settlementAmount);
  el.compMsRate.textContent = msResult.marginOnSellingPrice.toFixed(1) + '%';
  el.compCmSettle.textContent = formatKRW(cmResult.settlementAmount);
  el.compCmRate.textContent = cmResult.marginOnSellingPrice.toFixed(1) + '%';

  el.compMsBar.style.width = Math.max(0, Math.min(100, msResult.marginOnSellingPrice)) + '%';
  el.compCmBar.style.width = Math.max(0, Math.min(100, cmResult.marginOnSellingPrice)) + '%';
  el.compMsBarLabel.textContent = msResult.marginOnSellingPrice.toFixed(1) + '%';
  el.compCmBarLabel.textContent = cmResult.marginOnSellingPrice.toFixed(1) + '%';

  // 상세 명세 테이블 업데이트
  el.detRetail.textContent = formatKRW(retail);
  el.detDirect.textContent = '-' + formatKRW(retail - activeResult.sellingPrice);
  el.detSelling.textContent = formatKRW(activeResult.sellingPrice);
  el.detCoupon.textContent = '-' + formatKRW(activeResult.couponDiscount);
  
  if (currentPlatform === 'musinsa') {
    el.msDetailRow.style.display = 'table-row';
    el.detMember.textContent = '-' + formatKRW(activeResult.memberDiscount);
    // 무신사 브랜드 할인 분담 = 브랜드 쿠폰 부담 + 브랜드 회원 등급할인 부담 + 브랜드 적립금 부담
    el.detBrandShare.textContent = '-' + formatKRW(activeResult.brandCouponShare + activeResult.brandMemberShare + activeResult.brandPointShare);
  } else {
    el.msDetailRow.style.display = 'none';
    el.detBrandShare.textContent = '-' + formatKRW(activeResult.brandCouponShare);
  }

  el.detCommission.textContent = '-' + formatKRW(activeResult.platformCommission);
  el.detSettlement.textContent = formatKRW(activeResult.settlementAmount);
  el.detCost.textContent = '-' + formatKRW(cost);
  el.detMargin.textContent = formatKRW(activeResult.netMarginAmount);

  // 역산 권장 판매 소비자가 계산
  const rates = {
    commissionRate: comm,
    couponRate: coupon,
    couponBrandShare: couponShare,
    memberDiscountRate: member,
    memberBrandShare: memberShare,
  };
  const suggestedPrice = suggestSellingPrice(currentPlatform, cost, targetMargin, rates);
  
  if (suggestedPrice > 0) {
    el.recommendPrice.textContent = formatKRW(suggestedPrice);
    el.recommendDesc.textContent = `현재 할인 및 수수료 조건 하에 목표 마진율 ${targetMargin}%를 확보하기 위한 권장 소비자가입니다.`;
  } else {
    el.recommendPrice.textContent = '계산 불가';
    el.recommendDesc.textContent = '수수료 및 할인 부담 조건이 너무 높습니다.';
  }

  // 차트 시각화 업데이트
  updateChart(activeResult, cost);
}

// 5. Chart.js 렌더링 함수
function updateChart(result, cost) {
  const ctx = document.getElementById('marginChart').getContext('2d');
  
  // 데이터 구성
  const settlement = result.settlementAmount;
  const brandDiscountShare = result.brandCouponShare + result.brandMemberShare + result.brandPointShare;
  const comm = result.platformCommission;

  // 실질 매출 배분
  const dataValues = [
    result.netMarginAmount > 0 ? result.netMarginAmount : 0, // 순마진액
    cost, // 원가
    comm, // 수수료
    brandDiscountShare // 브랜드 할인 분담금
  ];

  if (marginChart) {
    marginChart.destroy();
  }

  marginChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['순마진액', '제조원가', '플랫폼수수료', '할인분담금'],
      datasets: [{
        data: dataValues,
        backgroundColor: [
          '#10b981', // green
          '#4b5563', // gray
          '#f59e0b', // amber
          '#ef4444'  // red
        ],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#9ca3af',
            font: {
              family: 'Outfit, sans-serif',
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              return ` ${label}: ${value.toLocaleString()}원`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

// 6. 슬라이더 이벤트 바인딩 및 라벨 갱신
function initSliders() {
  const sliders = [
    { input: el.directDiscount, val: el.directDiscountVal, unit: '%' },
    { input: el.commRate, val: el.commRateVal, unit: '%' },
    { input: el.couponRate, val: el.couponRateVal, unit: '%' },
    { input: el.couponShare, val: el.couponShareVal, unit: '%' },
    { input: el.memberDiscount, val: el.memberDiscountVal, unit: '%' },
    { input: el.memberShare, val: el.memberShareVal, unit: '%' },
  ];

  sliders.forEach(item => {
    item.input.addEventListener('input', (e) => {
      item.val.textContent = e.target.value + item.unit;
      updateCalculations();
    });
  });

  // 숫자 입력 박스 감지
  [el.retailPrice, el.costPrice, el.targetMarginRate].forEach(input => {
    input.addEventListener('input', updateCalculations);
  });
}

// 7. 플랫폼 스위치 기능
function initPlatformSelector() {
  el.platformBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // 액티브 클래스 교체
      el.platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentPlatform = btn.dataset.platform;

      // 무신사 전용 등급할인 필드 보이기/숨기기 및 수수료 범위 조절
      if (currentPlatform === 'musinsa') {
        el.musinsaOnlyFields.style.display = 'block';
        el.commRate.value = 28;
        el.commRateVal.textContent = '28%';
      } else {
        el.musinsaOnlyFields.style.display = 'none';
        el.commRate.value = 30;
        el.commRateVal.textContent = '30%';
      }

      updateCalculations();
    });
  });
}

// 8. 탭 네비게이션 기능
function initTabs() {
  el.navItems.forEach(item => {
    item.addEventListener('click', () => {
      el.navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const targetTabId = item.dataset.tab;
      el.tabContents.forEach(content => {
        if (content.id === targetTabId) {
          content.classList.add('active');
          content.style.display = 'flex';
        } else {
          content.classList.remove('active');
          content.style.display = 'none';
        }
      });
      
      // 모바일 시뮬레이터 동기화
      if (targetTabId === 'banner-simulator-tab') {
        syncMobilePreview();
      }
    });
  });
}

// 9. 모바일 시뮬레이터 테마 스위치 기능
function initSimulatorTheme() {
  el.simulatorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.simulatorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      simulatorTheme = btn.dataset.simulatorTheme;
      syncMobilePreview();
    });
  });

  // 텍스트 필드 변경 감지 및 실시간 동기화
  [el.simBrand, el.simBadge, el.simTitle, el.simSubtitle].forEach(input => {
    input.addEventListener('input', syncMobilePreview);
  });
}

// 모바일 프리뷰 업데이트
function syncMobilePreview() {
  const brand = el.simBrand.value;
  const badge = el.simBadge.value;
  const title = el.simTitle.value;
  const subtitle = el.simSubtitle.value;

  if (simulatorTheme === 'musinsa') {
    el.phoneScreenTarget.className = 'phone-screen theme-musinsa';
    el.previewMusinsaStructure.style.display = 'block';
    el.preview29cmStructure.style.display = 'none';

    el.previewMsBrand.textContent = brand;
    el.previewMsTitle.textContent = title;
    el.previewMsSubtitle.textContent = subtitle;
    el.previewMsBadge.textContent = badge;
  } else {
    el.phoneScreenTarget.className = 'phone-screen theme-29cm';
    el.previewMusinsaStructure.style.display = 'none';
    el.preview29cmStructure.style.display = 'block';

    el.previewCmBrand.textContent = brand;
    el.previewCmTitle.textContent = title;
    el.previewCmSubtitle.textContent = subtitle;
    el.previewCmBadge.textContent = 'SPECIAL ORDER ' + badge;
  }
}

// 10. AI 이미지 생성 API 연동 및 폴링
function initAIImageGenerator() {
  el.btnGenerateImage.addEventListener('click', async () => {
    const prompt = el.simPrompt.value.trim();
    if (!prompt) {
      alert('화보 프롬프트를 입력해 주세요!');
      return;
    }

    if (isGeneratingImage) return;
    
    // UI 로딩 상태 시작
    isGeneratingImage = true;
    el.btnGenerateImage.disabled = true;
    el.btnGenerateImage.innerHTML = `<span class="spinner"></span> <span>AI 화보 생성 요청 중... (터미널 확인)</span>`;

    try {
      // 1. Python 서버로 이미지 생성 요청 전송
      const res = await fetch(`/api/generate-request?prompt=${encodeURIComponent(prompt)}`);
      if (!res.ok) {
        throw new Error('API server request failed');
      }
      
      const data = await res.json();
      console.log('AI Generation requested:', data);

      // 2. 이미지가 디스크에 써질 때까지 3초마다 폴링
      let attempts = 0;
      const maxAttempts = 30; // 최대 90초 대기
      
      const checkImageInterval = setInterval(async () => {
        attempts++;
        
        // 캐시 방지를 위해 타임스탬프 추가
        const testImgUrl = `/src/assets/generated_banner.png?t=${Date.now()}`;
        
        try {
          const checkRes = await fetch(testImgUrl, { method: 'HEAD' });
          if (checkRes.ok) {
            // 이미지 생성이 감지됨!
            clearInterval(checkImageInterval);
            
            // 프리뷰 배경 이미지 적용
            const bgCss = `url('${testImgUrl}')`;
            el.musinsaBannerBg.style.backgroundImage = bgCss;
            el.musinsaProdImg1.style.backgroundImage = bgCss;
            el.cmBannerBg.style.backgroundImage = bgCss;

            // 로딩 종료
            resetAIGeneratorState(true);
          }
        } catch (e) {
          console.log('Polling image error:', e);
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkImageInterval);
          resetAIGeneratorState(false, '이미지 생성 시간을 초과했습니다. 에이전트의 터미널 아웃풋을 확인하거나 수동으로 업로드해 주세요.');
        }
      }, 3000);

    } catch (err) {
      console.error(err);
      resetAIGeneratorState(false, '서버 통신 오류가 발생했습니다. 로컬 서버(server.py)가 켜져 있는지 확인해 주세요.');
    }
  });
}

function resetAIGeneratorState(success, errMsg = '') {
  isGeneratingImage = false;
  el.btnGenerateImage.disabled = false;
  el.btnGenerateImage.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
    <span>AI 룩북 화보 이미지 생성하기</span>
  `;
  if (!success && errMsg) {
    alert(errMsg);
  }
}

// 11. 초기화 실행
window.addEventListener('DOMContentLoaded', () => {
  initSliders();
  initPlatformSelector();
  initTabs();
  initSimulatorTheme();
  initAIImageGenerator();
  updateCalculations();
});
