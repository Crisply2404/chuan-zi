# 手机键盘与答案格

日期：2026-10-13，Asia/Shanghai。Skill：`research`。资料已完整下载到 `.research/mobile-*`；代码只读检查范围为 `index.html`、`src/App.tsx`、`src/PromptView.tsx` 和 `src/styles.css`。

## 官方行为

- Chrome Android 从 108 起，默认键盘只缩小 `VisualViewport`，页面的 Layout Viewport 和 viewport CSS 单位保持原来的大小。页面底部的固定内容可能被键盘遮挡。`interactive-widget=resizes-content` 可以让 Chrome 同时调整两个 viewport。[Chrome 官方说明](https://developer.chrome.com/blog/viewport-resize-behavior)
- `VisualViewport.height` 是当前可见高度；`offsetTop` 是可见区域顶部相对于 Layout Viewport 顶部的位置。与 `getBoundingClientRect()` 使用同一坐标关系时，可见下边界为 `offsetTop + height`。需要同时监听 `resize` 和 `scroll`，因为浏览器还可能移动可见区域。`pageTop` 用于文档坐标，不能直接与 DOMRect 相加。[VisualViewport 文档](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- WebKit 从 Safari 13 支持 Visual Viewport API，官方明确说明它可用于使自定义编辑区域和光标避开屏幕键盘。[WebKit 官方发布说明](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)
- `focus()` 默认允许浏览器将原生控件滚动至可见区域，`focus({ preventScroll: true })` 阻止这次自动滚动。浏览器只认识原生控件的矩形，因此游戏仍需维护完整答案格区域的可见性。[focus 文档](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus)
- `interactive-widget=resizes-content` 的规范行为是同时调整初始 viewport 与 Visual Viewport。浮动或分离键盘形成非矩形遮挡时，具体 viewport 变化由浏览器决定。[CSS Viewport 规范](https://drafts.csswg.org/css-viewport/)

## 支持范围

`VisualViewport` 的 MDN 原始兼容资料记录 Chrome 61、Safari 13、Firefox Android 68；`height`、`offsetTop` 与两种事件可用于当前 Android Chrome 与 iOS Safari。完整兼容资料保存在 `.research/mobile-visual-viewport-compat.json`。

Chrome 官方在 108 发布时记录 `interactive-widget` 尚未适用于 WebKit。2026-10-13 获取的 WebKit `main` 已包含 `InteractiveWidgetValue`，解析由 `MetaViewportInteractiveWidgetEnabled` 控制，COCOA 配置默认开启。这是当前源码事实，无法据此确认每个已发布 Safari 的版本与行为；跨浏览器实现需要继续使用实际 `VisualViewport` 数据。源码保存在 `.research/mobile-webkit-viewport.cpp`、`.research/mobile-webkit-viewport.h`、`.research/mobile-webkit-preferences.yaml`。

`VirtualKeyboard` 从 Chromium 94 可用，要求 Secure Context；MDN 兼容资料记录 Safari 与 Firefox 尚不支持。`boundingRect` 和 `geometrychange` 可以提供真实键盘矩形，`overlaysContent=true` 会关闭浏览器自动调整 viewport 的行为。该 API 适合掌握全部布局的 Chromium 应用，本项目跨浏览器输入保留浏览器默认键盘行为，并使用 `VisualViewport`。浮动键盘的精确遮挡需要此矩形或设备验证，单纯可见高度没有完整几何资料。[Chrome API 文档](https://developer.chrome.com/docs/web-platform/virtual-keyboard)、[VirtualKeyboard 文档](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard)、[API 规范](https://w3c.github.io/virtual-keyboard/)

## 项目实现建议

1. 在 viewport meta 中添加 `interactive-widget=resizes-content`；保留用户缩放能力。
2. 页面读取真实 `visualViewport.height`、`offsetTop`、`width`、`scale`。监听 `VisualViewport.resize`、`VisualViewport.scroll`、`window.resize`、焦点变化及答案区域 `ResizeObserver`；使用 `requestAnimationFrame` 合并同一帧的测量。
3. 游戏键盘显示期间，将包含计时、题目与答案格的作答区域保持在可见区域下方，保留安全区域距离。整个作答区域使用同一个 DOM 容器，原生 input 继续位于对应答案格内；节点保持身份，输入法和补间元素继续原有生命周期。
4. 可见高度不足时，页面头部、房间标题和拓扑可以通过滚动移出屏幕，答案格优先保持可见。作答区域使用可见高度控制的容器，容器允许滚动；完整答案格需要满足 `rect.top >= offsetTop` 与 `rect.bottom <= offsetTop + height - gap`。若采用固定作答区域，`top` 以 `offsetTop + height - regionHeight - gap` 计算，并保证其定位祖先没有改变 fixed 坐标的 transform。
5. 点击答案格时，在同一用户手势中聚焦原生 input，并立即将完整作答区域滚动到可见位置。键盘随后触发真实 viewport 变化时再次测量；内容、候选栏与设备方向变化采用同一更新过程。即使 input 已经拥有焦点，仍需处理这次点击。每次只在边界确实超出时移动页面。
6. 手动滚动与可见区域平移时维护完整边界；键盘关闭后恢复正常游戏布局，保留输入与原生光标。页面内聊天输入使用相同可见高度，保证底部发送区域能操作。

`100dvh` 不能单独表示各浏览器键盘上方的空间。当前页面 `room-game-shell` 使用 `height:100dvh`，点击答案格与自动回合焦点都设置了 `preventScroll:true`；当前完整答案区域的矩形需要纳入上述可见区域处理。

## 验证与当前限制

真实 Android Chrome 验证需要连接运行浏览器的设备，通过 DevTools/CDP 获取页面 DOM 与实际 viewport；Chrome 官方支持 USB 或 adb Wi-Fi 连接。[Android 远程调试说明](https://developer.chrome.com/docs/devtools/remote-debugging/)

真实 iOS Safari 验证可以通过已连接设备的 Safari Web Inspector 或 iOS WebDriver。WebKit 官方说明 iOS WebDriver 需要连接设备、启用 Remote Automation，并使用支持 iOS 的 `safaridriver`。[WebKit 官方说明](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)

真实设备验收应记录键盘关闭、点击、键盘展开过程、中文输入法候选切换、一次确认多个汉字、末尾删除、回合切换、方向变化与关闭键盘的逐帧数据。每帧记录 `height`、`offsetTop`、`scale`、当前答案 DOMRect、原生 input 焦点与选择位置。正常停靠键盘展开完成后，全部答案格位于可见下边界上方；输入字词、动画和光标保持连续。

本轮研究环境没有连接 Android 或 iOS 设备，因此尚未获得真实手机键盘运行记录。桌面真实浏览器窗口调整、缩放与 DOM 几何检查可以验证布局处理，DevTools 手机尺寸或 Playwright viewport 调整只能验证响应式布局。测试报告分别记录这些能力；任何人工派发 viewport 事件、覆盖 API 数值或截图绘制键盘的检查都不能证明真实手机键盘体验。

## 当前实现验证

根会话随后使用 Android emulator Chrome 取得真实停靠键盘记录：可见高度从 763.0px 变为 450.3px，答案底部为 413.4px，输入汉字后保持可见和焦点。记录位于 `.scratch/android-runtime/keyboard-check.json`，原生 input_method 服务同时确认键盘已经显示。横屏拓展检查遇到 emulator Chrome ANR，iOS 尚未实测；当前结果证明这次 Android 停靠键盘与确认输入路径。
