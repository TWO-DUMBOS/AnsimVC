pragma circom 2.0.0;

template IncomeCheck() {
    // Private Input: 사용자의 월 소득 (외부 미노출)
    signal input userIncome;
    
    // Public Input: 기준 소득 (대구시 공고 기준)
    signal input incomeLimit;

    // Output: 조건 충족 여부
    signal output isEligible;
}

component main {public [incomeLimit]} = IncomeCheck();