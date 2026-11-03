/**
 * 描画の port。domain はこの interface だけに依存し、Canvas2D などの
 * 具体技術は infra 側（infra/render-canvas2d/）が実装する。
 * Scene 全体を渡して毎回描き直す immediate mode の最小 API にしている
 * （採用理由は docs/feature_canvas/rendering.md）。
 */

import type { Scene } from "../scene/scene";


export interface Renderer {
    render(scene: Scene): void;
}
