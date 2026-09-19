pragma circom 2.0.0;

// 빌드 (프로젝트 루트에서):
//   circom circuits/eligibility.circom --r1cs --wasm --sym -o circuits/build
//   snarkjs groth16 setup circuits/build/eligibility.r1cs circuits/build/pot8_final.ptau circuits/build/e0.zkey
//   snarkjs zkey contribute circuits/build/e0.zkey public/zk/eligibility_final.zkey --name="ansimvc-dev" -e="아무 문자열"
//   snarkjs zkey export verificationkey public/zk/eligibility_final.zkey public/zk/verification_key.json
//   cp circuits/build/eligibility_js/eligibility.wasm public/zk/eligibility.wasm
//   (pot8_final.ptau: snarkjs powersoftau new bn128 8 → contribute → prepare phase2. 데모용 로컬 setup)

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// 연령 범위 + 월 소득 상한을 동시에 증명한다.
//   minAge <= age <= maxAge  AND  income <= incomeThreshold   (lib/policies.ts checkEligibility 와 같은 기준)
//
// ⚠️ publicSignals 순서 = [isEligible, minAge, maxAge, incomeThreshold] (lib/types.ts, app/api/verify 가 의존)
//    output 이 먼저, 그 뒤 public input 이 "선언 순서대로" 나오므로 아래 signal 선언 순서를 바꾸지 말 것.
template Eligibility() {
    // private: 브라우저 밖으로 나가지 않는 값
    signal input age;
    signal input income;

    // public: lib/policies.ts 에서 주입
    signal input minAge;
    signal input maxAge;
    signal input incomeThreshold;

    // 1: 자격 충족 / 0: 미달 (미달이어도 유효한 증명이 만들어진다 — 정책A 미달 데모용)
    signal output isEligible;

    // LessThan 은 입력이 비트 범위 안이라고 가정한다.
    // 범위 검사가 없으면 income = p-5(= -5) 같은 값으로 비교를 속일 수 있다.
    component ageBits = Num2Bits(8);
    ageBits.in <== age;
    component incomeBits = Num2Bits(64);
    incomeBits.in <== income;

    component geMin = GreaterEqThan(8);
    geMin.in[0] <== age;
    geMin.in[1] <== minAge;

    component leMax = LessEqThan(8);
    leMax.in[0] <== age;
    leMax.in[1] <== maxAge;

    component leIncome = LessEqThan(64);
    leIncome.in[0] <== income;
    leIncome.in[1] <== incomeThreshold;

    signal ageOk;
    ageOk <== geMin.out * leMax.out;
    isEligible <== ageOk * leIncome.out;
}

component main {public [minAge, maxAge, incomeThreshold]} = Eligibility();
