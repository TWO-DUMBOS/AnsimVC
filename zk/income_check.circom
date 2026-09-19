pragma circom 2.0.0;

// Circom 기본 라이브러리의 비교 연산 컴포넌트 불러오기
include "../node_modules/circomlib/circuits/comparators.circom";

template IncomeCheck() {
    // 1. Private Input: 사용자의 월 소득 (외부에 절대 노출되지 않음)
    signal input userIncome;
    
    // 2. Public Input: 대구시 지원사업 기준 소득 limit
    signal input incomeLimit;

    // 3. Output: 조건 충족 여부 (1: 소득 조건 충족 / 0: 불충족)
    signal output isEligible;

    // 4. 숫자의 비트 수 설정 (예: 64비트 정수 범위 내 비교)
    component lt = LessThan(64);

    // LessThan 컴포넌트에 입력값 연결
    lt.in[0] <== userIncome;
    lt.in[1] <== incomeLimit;

    // 비교 결과(1 또는 0)를 출력값에 할당
    isEligible <== lt.out;
    
    // 조건 강제: 소득이 기준보다 작은 경우(isEligible == 1)만 올바른 증명으로 인정
    isEligible === 1;
}

// incomeLimit만 공개(Public) 입력으로 설정
component main {public [incomeLimit]} = IncomeCheck();