/**
 * 무신사 및 29CM 정산/마진 계산기 유틸리티
 */

/**
 * 정산 결과 구조체 정의
 * @typedef {Object} MarginResult
 * @property {number} sellingPrice - 최종 판매가 (소비자가 - 브랜드 자체 할인가)
 * @property {number} couponDiscount - 쿠폰 할인액
 * @property {number} memberDiscount - 회원 등급 할인액
 * @property {number} pointAccrual - 적립금 할인액
 * @property {number} platformCommission - 플랫폼 수수료 (부과액)
 * @property {number} brandCouponShare - 브랜드 부담 쿠폰 할인액
 * @property {number} brandMemberShare - 브랜드 부담 회원 할인액
 * @property {number} brandPointShare - 브랜드 부담 적립금액
 * @property {number} totalBrandDiscountShare - 브랜드가 부담한 총 할인액 (수수료 제외)
 * @property {number} settlementAmount - 최종 정산 금액 (VAT 포함)
 * @property {number} netMarginAmount - 순마진액 (정산금 - 원가)
 * @property {number} marginOnSellingPrice - 판매가 대비 마진율 (%)
 * @property {number} marginOnSettlement - 정산금 대비 마진율 (%)
 */

/**
 * 무신사 마진 계산 함수
 * @param {Object} params
 * @param {number} params.retailPrice - 소비자가 (정가)
 * @param {number} params.directDiscountRate - 브랜드 자체 할인율 (0 ~ 100)
 * @param {number} params.cost - 제조원가
 * @param {number} params.commissionRate - 무신사 기본 수수료율 (0 ~ 100)
 * @param {number} params.couponRate - 무신사 쿠폰 할인율 (0 ~ 100)
 * @param {number} params.couponBrandShare - 브랜드 쿠폰 분담율 (0 ~ 100)
 * @param {number} params.memberDiscountRate - 회원 등급 할인율 (0 ~ 100)
 * @param {number} params.memberBrandShare - 브랜드 회원 할인 분담율 (0 ~ 100)
 * @param {number} params.pointRate - 적립금 적립율 (0 ~ 100, 기본 1%)
 * @param {number} params.pointBrandShare - 브랜드 적립금 분담율 (0 ~ 100, 기본 100%)
 * @returns {MarginResult}
 */
export function calculateMusinsa(params) {
  const {
    retailPrice,
    directDiscountRate = 0,
    cost,
    commissionRate = 28,
    couponRate = 0,
    couponBrandShare = 50,
    memberDiscountRate = 0,
    memberBrandShare = 50,
    pointRate = 1,
    pointBrandShare = 100,
  } = params;

  // 1. 브랜드 자체 할인이 적용된 최종 판매가 (무신사 상품 페이지 노출가)
  const sellingPrice = Math.round(retailPrice * (1 - directDiscountRate / 100));

  // 2. 각종 할인액 계산
  const couponDiscount = Math.round(sellingPrice * (couponRate / 100));
  const memberDiscount = Math.round(sellingPrice * (memberDiscountRate / 100));
  const pointAccrual = Math.round(sellingPrice * (pointRate / 100));

  // 3. 브랜드 분담 할인액 계산
  const brandCouponShare = Math.round(couponDiscount * (couponBrandShare / 100));
  const brandMemberShare = Math.round(memberDiscount * (memberBrandShare / 100));
  const brandPointShare = Math.round(pointAccrual * (pointBrandShare / 100));

  // 4. 수수료 기준가 (쿠폰 및 회원 등급 할인이 적용된 최종 결제액 기준 수수료 계산)
  const commissionBasePrice = Math.max(0, sellingPrice - couponDiscount - memberDiscount);
  const platformCommission = Math.round(commissionBasePrice * (commissionRate / 100));

  // 5. 총 브랜드 할인 분담금 (수수료 외 브랜드가 직접 차감당하는 할인액)
  const totalBrandDiscountShare = brandCouponShare + brandMemberShare + brandPointShare;

  // 6. 최종 정산액 = 실결제액 - 수수료 - 브랜드 추가 분담액
  // 무신사는 대개 결제액에서 수수료를 떼고 브랜드 분담금을 차감함
  const settlementAmount = Math.max(0, commissionBasePrice - platformCommission - (totalBrandDiscountShare - brandCouponShare - brandMemberShare)); 
  // 실제 정밀 계산: 정산금 = 판매가 - 수수료 - 브랜드분담쿠폰 - 브랜드분담등급할인 - 브랜드분담적립금
  const exactSettlement = Math.max(0, sellingPrice - platformCommission - brandCouponShare - brandMemberShare - brandPointShare);

  const netMarginAmount = exactSettlement - cost;
  const marginOnSellingPrice = sellingPrice > 0 ? (netMarginAmount / sellingPrice) * 100 : 0;
  const marginOnSettlement = exactSettlement > 0 ? (netMarginAmount / exactSettlement) * 100 : 0;

  return {
    sellingPrice,
    couponDiscount,
    memberDiscount,
    pointAccrual,
    platformCommission,
    brandCouponShare,
    brandMemberShare,
    brandPointShare,
    totalBrandDiscountShare,
    settlementAmount: exactSettlement,
    netMarginAmount,
    marginOnSellingPrice,
    marginOnSettlement,
  };
}

/**
 * 29CM 마진 계산 함수
 * @param {Object} params
 * @param {number} params.retailPrice - 소비자가 (정가)
 * @param {number} params.directDiscountRate - 브랜드 자체 할인율 (0 ~ 100)
 * @param {number} params.cost - 제조원가
 * @param {number} params.commissionRate - 29CM 기본 수수료율 (0 ~ 100)
 * @param {number} params.couponRate - 29CM 쿠폰 할인율 (0 ~ 100)
 * @param {number} params.couponBrandShare - 브랜드 쿠폰 분담율 (0 ~ 100)
 * @returns {MarginResult}
 */
export function calculate29CM(params) {
  const {
    retailPrice,
    directDiscountRate = 0,
    cost,
    commissionRate = 30,
    couponRate = 0,
    couponBrandShare = 50,
  } = params;

  // 1. 브랜드 자체 할인이 적용된 최종 판매가
  const sellingPrice = Math.round(retailPrice * (1 - directDiscountRate / 100));

  // 2. 쿠폰 할인액 계산
  const couponDiscount = Math.round(sellingPrice * (couponRate / 100));
  const brandCouponShare = Math.round(couponDiscount * (couponBrandShare / 100));

  // 3. 수수료 기준가 (29CM는 보통 쿠폰 적용 후 판매가 기준으로 수수료 부과)
  const commissionBasePrice = Math.max(0, sellingPrice - couponDiscount);
  const platformCommission = Math.round(commissionBasePrice * (commissionRate / 100));

  // 4. 최종 정산액 = 판매가 - 수수료 - 브랜드분담쿠폰
  const settlementAmount = Math.max(0, sellingPrice - platformCommission - brandCouponShare);

  const netMarginAmount = settlementAmount - cost;
  const marginOnSellingPrice = sellingPrice > 0 ? (netMarginAmount / sellingPrice) * 100 : 0;
  const marginOnSettlement = settlementAmount > 0 ? (netMarginAmount / settlementAmount) * 100 : 0;

  return {
    sellingPrice,
    couponDiscount,
    memberDiscount: 0,
    pointAccrual: 0,
    platformCommission,
    brandCouponShare,
    brandMemberShare: 0,
    brandPointShare: 0,
    totalBrandDiscountShare: brandCouponShare,
    settlementAmount,
    netMarginAmount,
    marginOnSellingPrice,
    marginOnSettlement,
  };
}

/**
 * 목표 마진율을 달성하기 위한 최소 판매가(소비자가) 역산 함수
 * @param {string} platform - 'musinsa' | '29cm'
 * @param {number} cost - 제조원가
 * @param {number} targetMarginRate - 목표 마진율 (판매가 대비, %)
 * @param {Object} rates - 수수료율 및 분담비율 세트
 * @returns {number} - 권장 판매가
 */
export function suggestSellingPrice(platform, cost, targetMarginRate, rates) {
  // 간단한 근사 혹은 반복법을 통해 계산 (할인율이 얽혀있어 대수적으로 풀기 어려움)
  // 목표마진율 M = (정산금 - 원가) / 판매가
  // 즉, 정산금 - 원가 = 판매가 * M => 정산금 = 원가 + 판매가 * M
  // 정산금 공식: 판매가 * (1 - 실질수수료율 - 실질할인분담율) = 원가 + 판매가 * M
  // 판매가 * (1 - M - 실질수수료율 - 실질할인분담율) = 원가
  // 판매가 = 원가 / (1 - M - 실질수수료율 - 실질할인분담율)
  
  const targetM = targetMarginRate / 100;
  
  if (platform === 'musinsa') {
    const comm = (rates.commissionRate || 28) / 100;
    const coup = (rates.couponRate || 0) / 100;
    const coupShare = (rates.couponBrandShare || 50) / 100;
    const memb = (rates.memberDiscountRate || 0) / 100;
    const membShare = (rates.memberBrandShare || 50) / 100;
    const point = (rates.pointRate || 1) / 100;
    const pointShare = (rates.pointBrandShare || 100) / 100;
    
    // 실질수수료: 쿠폰과 등급할인이 차감된 금액에 부과되므로 comm * (1 - coup - memb)
    const effectiveComm = comm * (1 - coup - memb);
    // 실질 할인 분담율
    const effectiveShare = (coup * coupShare) + (memb * membShare) + (point * pointShare);
    
    const denominator = 1 - targetM - effectiveComm - effectiveShare;
    if (denominator <= 0) return 0;
    return Math.round(cost / denominator);
  } else {
    const comm = (rates.commissionRate || 30) / 100;
    const coup = (rates.couponRate || 0) / 100;
    const coupShare = (rates.couponBrandShare || 50) / 100;
    
    const effectiveComm = comm * (1 - coup);
    const effectiveShare = coup * coupShare;
    
    const denominator = 1 - targetM - effectiveComm - effectiveShare;
    if (denominator <= 0) return 0;
    return Math.round(cost / denominator);
  }
}
