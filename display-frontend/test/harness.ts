/**
 * ブラウザ内テストハーネス。
 * 各 *.test.ts が import 時に test() を呼んで結果を登録し、unit.html が
 * renderTestResults() で PASS/FAIL 一覧を画面に描く。
 * テストランナーを追加せず Vite dev だけで実行できるようにしている
 * （選定理由は docs/feature_canvas/input-and-demo.md）。
 */

type TestResult = {
    test_name: string;
    error: Error | null;
}

const testResults: TestResult[] = [];

export const test = (test_name: string, body: () => void): void => {
    try {
        body();
        testResults.push({ test_name, error: null });
    } catch (caught) {
        const error = caught instanceof Error ? caught : new Error(String(caught));
        testResults.push({ test_name, error });
    }
};

/**
 * 型注釈を `asserts condition` にしているため、通過後は TypeScript 側でも
 * 条件が成り立っているものとして扱える（union の絞り込みに使える）。
 * 実行時の挙動は「偽なら投げる」だけで、注釈がなかった頃と変わらない。
 */
export const assert: (condition: boolean, message: string) => asserts condition = (
    condition,
    message,
) => {
    if (!condition) {
        throw new Error(message);
    }
};

/** 数値は誤差 1e-9 まで許容して比較する（カメラ変換の往復で浮動小数の誤差が出るため） */
export const assertCloseTo = (actual: number, expected: number, label: string): void => {
    const withinTolerance = Math.abs(actual - expected) < 1e-9;
    if (!withinTolerance) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
    }
};

export const assertPointCloseTo = (
    actual: { x: number; y: number },
    expected: { x: number; y: number },
    label: string,
): void => {
    assertCloseTo(actual.x, expected.x, `${label}.x`);
    assertCloseTo(actual.y, expected.y, `${label}.y`);
};

export const renderTestResults = (container: HTMLElement): void => {
    const failedCount = testResults.filter((result) => result.error !== null).length;
    const summary = document.createElement("h2");
    summary.textContent = failedCount === 0
        ? `ALL PASS (${testResults.length} tests)`
        : `${failedCount} FAILED / ${testResults.length} tests`;
    summary.style.color = failedCount === 0 ? "green" : "red";
    container.appendChild(summary);

    const list = document.createElement("ul");
    for (const result of testResults) {
        const item = document.createElement("li");
        if (result.error === null) {
            item.textContent = `PASS: ${result.test_name}`;
            item.style.color = "green";
        } else {
            item.textContent = `FAIL: ${result.test_name} — ${result.error.message}`;
            item.style.color = "red";
        }
        list.appendChild(item);
    }
    container.appendChild(list);
};
