# 输入错误反馈与局部动画研究

研究日期：2026-10-13（Asia/Shanghai）。使用 `research` Skill。用户要求输入错误时在方格内部短暂闪色与位移，研究目标是核查这种局部反馈的适用性，以及 Apple、W3C 与 Material 资料给出的边界。研究过程中没有运行系统错误密码流程，也没有进行主动视觉检查。

## 结论适用于击鼓传字

答案方格内部的短暂颜色变化和小幅位移符合当前游戏反馈目标。反馈应该靠近答案方格出现，持续时间短，保留原生输入焦点，并允许玩家立即继续输入。可访问性方面，需要为反馈提供文字状态或文字替代；颜色与运动可以承担视觉辅助作用。下文将官方要求与本项目已经确定的可见反馈分别说明。

当前产品规则将无效答案定义为回合反馈，游戏继续计时，不显示持续错误横幅或弹窗。这个设计与 Apple 对反馈层级的建议相符：Apple 建议把状态反馈放在相关界面附近，只有重要且需要打断任务的信息才使用 alert；W3C 要求自动检测到的输入错误识别具体错误项目并提供文字说明或文字替代。答案格的视觉反馈可以与供辅助技术读取的 `role="status"` 文字状态并存，提交失败时可以使用 `aria-invalid="true"` 和 `aria-errormessage` 关联说明。

局部反馈的实现边界如下：

- 错误反馈只改变答案格边框、背景色或内容区域，并配合一次短距离水平位移；页面背景、拓扑图、中央鼓和其他玩家区域保持稳定。
- 使用短暂深红或朱红作为辅助颜色，并配合短距离位移这一可见形态变化。用户已经确定重复词的可见文字位于答案格下方；其他无效答案采用短暂游戏反馈，文字替代可供辅助技术读取。
- 文字状态使用 `role="status"`、`aria-live="polite"`，错误需要立即被读到时使用 `role="alert"` 或等效 live region。重复提交和普通回合反馈不应使用会抢走焦点的 `alertdialog`。
- `aria-invalid="true"` 只在当前输入已经被判定为错误后设置；输入开始修改或新回合开始后清除。WAI-ARIA 明确要求在用户尚未提交时，不要因为必填字段为空就提前设置无效状态。
- 错误文字应说明发生了什么，并在有确定修正方式时给出简短建议。提示窗口继续展示当前提示，玩家无需离开当前输入区域。
- 单次反馈不应产生超过每秒三次的闪烁，也不应使用高亮红色快速反复切换。W3C 的三次闪烁规则把三次以内作为上限，红色闪烁还有更严格的风险阈值。
- 反馈动画应可取消：错误反馈完成前，玩家可以继续编辑；新的输入会立即终止旧反馈并清除错误状态。

## Apple Human Interface Guidelines

### 反馈位置和中断级别

Apple 的 Feedback 页面说明，反馈可以表达状态、重要任务成功或失败、警告以及纠正问题的机会。Apple 建议让反馈方式与信息重要程度相匹配：相关内容附近的状态信息可以被动展示；警告和关键任务才需要打断当前操作。Apple 还明确建议确保反馈可访问，在使用颜色时同时提供文字、声音或触觉等其他方式。

这支持在答案格内部变色与位移，并在答案格下方设置短暂文字状态。无效答案不会造成数据丢失，也不需要弹出模态提示。来源：

- [Apple HIG Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- 本轮完整网页文本：[`.research/input-feedback-hig-feedback-text.txt`](../.research/input-feedback-hig-feedback-text.txt)
- 官方结构化资料：[`.research/input-feedback-hig-feedback-data.json`](../.research/input-feedback-hig-feedback-data.json)

### 文字输入和及时检查

Apple 的 Text fields 页面说明，文本字段适合少量、明确的输入；在适合的时机验证字段。Apple 的 Entering Data 页面进一步建议动态验证字段值，在检测到问题后立即提供反馈，让用户可以马上修正。该原则支持把“词已使用”提示放在玩家提交前：当当前输入已经完整形成一个本局已用词时，可以在答案格下方显示状态，提交动作继续执行既定扣时规则。

Apple 同时要求输入区域保持可用，并根据系统键盘遮挡调整界面。击鼓传字使用原生 `input`，方格只是它的可视化表示，因此错误反馈不能替换、禁用或抢走原生输入焦点。

来源：

- [Apple HIG Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields)
- [Apple HIG Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)
- 完整结构化文本：[`.research/input-feedback-hig-text-fields-text.txt`](../.research/input-feedback-hig-text-fields-text.txt)、[`.research/input-feedback-hig-entering-data.json`](../.research/input-feedback-hig-entering-data.json)
- UIKit `UITextField` 官方说明：[`UITextField.md`](https://developer.apple.com/documentation/uikit/uitextfield.md)。该页面说明文本字段使用 delegate 处理编辑、验证和回车，并可以通过 overlay view 显示相关信息。

### Apple 对 alert 的边界

Apple 的 Alerts 页面要求谨慎使用 alert，避免用 alert 仅仅提供信息，也建议错误或启动状态使用不打断当前任务的界面区域。无效答案属于高频、可立即修正的回合反馈，不满足模态 alert 的必要条件；连接中断等系统问题可以使用独立系统错误区域。

来源：

- [Apple HIG Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- 完整官方结构化资料：[`.research/input-feedback-hig-alerts-data.json`](../.research/input-feedback-hig-alerts-data.json)

### Apple 动画上下文和时序

`NSAnimationContext` 官方文档说明，动画上下文可以为一组属性变化设置统一的 `duration`、`timingFunction` 和完成处理；`duration` 决定可动画属性变化持续的时间，`timingFunction` 决定动画时间函数。该 API 属于 AppKit，网页不会直接调用它，但概念可以作为平台行为的对照：错误反馈应使用明确的短持续时间和时间函数，让位移在开始和结束时自然收束。

来源：

- [`NSAnimationContext`](https://developer.apple.com/documentation/appkit/nsanimationcontext.md)
- [`NSAnimationContext.duration`](https://developer.apple.com/documentation/appkit/nsanimationcontext/duration.md)
- [`NSAnimationContext.timingFunction`](https://developer.apple.com/documentation/appkit/nsanimationcontext/timingfunction.md)
- 本轮完整页面副本：[`.research/input-feedback-nsanimationcontext.md`](../.research/input-feedback-nsanimationcontext.md)、[`.research/input-feedback-nsanimation-duration.md`](../.research/input-feedback-nsanimation-duration.md)、[`.research/input-feedback-nsanimation-timingfunction.md`](../.research/input-feedback-nsanimation-timingfunction.md)

Apple HIG 的 Motion 页面还给出游戏反馈边界：反馈动画应该简短、精确并且与动作相关；运动不能成为传达错误的唯一方式；用户不应因为重复反馈被迫等待动画结束。该指导支持使用约三百毫秒级的方格抖动，并在新输入到达时取消当前动画。

来源：

- [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- 完整文本：[`.research/input-feedback-hig-motion-text.txt`](../.research/input-feedback-hig-motion-text.txt)

## Material Design 3

### 文本字段错误状态

Material Design 3 的 Text fields 指南明确提供错误文字和错误图标：验证文本字段时，用 error text 替换 supporting text，以避免错误文字出现后推动其他界面内容；如果只有一种错误，应说明如何避免错误；如果有多种错误，应说明最可能的错误。指南强烈建议在错误状态显示错误图标，帮助视觉能力受限的用户识别错误。

击鼓传字可以采用稳定状态行这一原则：在答案格下方预留重复词文字区域，让提示出现时保持布局。其他规则拒绝使用方格内部颜色变化与小幅位移；可访问的文字替代负责说明拒绝。Material 的错误图标属于参考建议，用户没有要求加入产品。

来源：

- [Material Design 3 Text fields Guidelines](https://m3.material.io/components/text-fields/guidelines)
- [Material Design 3 Text fields Accessibility](https://m3.material.io/components/text-fields/accessibility)
- 真实页面完整文本：[`.research/input-feedback-material-guidelines-text.txt`](../.research/input-feedback-material-guidelines-text.txt)、[`.research/input-feedback-material-accessibility-text.txt`](../.research/input-feedback-material-accessibility-text.txt)
- Material Web 官方实现文档：[`material-web/text-field.md`](https://raw.githubusercontent.com/material-components/material-web/main/docs/components/text-field.md)。该文档公开 `error`、`error-text`、`supporting-text`、`reportValidity()`、`aria-label` 和原生约束验证的实现接口。

Material Components Web 的文本字段文档还公开 `shakeLabel(shouldShake)`，其说明为“Shakes the label to indicate an invalid input value”。这是局部位移表达非法输入的明确实现证据，作用对象是字段标签。击鼓传字将动作施加到答案方格，动作范围属于项目自己的设计。固定源码版本 `6ceadb81df508ac08ab007c52c4d3dc1d811cc15`，文档全文已读取并保存在 `.research/input-feedback-material-components-text-field.md`。

- [Material Components Web Text field 官方文档，固定版本](https://raw.githubusercontent.com/material-components/material-components-web/6ceadb81df508ac08ab007c52c4d3dc1d811cc15/packages/mdc-textfield/README.md)

### 颜色、形状和可访问性

Material Accessibility 页面要求文本字段错误消息可被辅助技术理解，并指出错误图标的 accessible label 应为“Error”。W3C WCAG 1.4.1 也要求颜色不能成为唯一错误标识；需要增加文字、图标、边框或形状等可见方式。当前方案将红色与方格内部短暂位移、边框变化和文字状态组合，满足这一信息表达方向。

来源：

- [Material Design 3 Text fields Accessibility](https://m3.material.io/components/text-fields/accessibility)
- [W3C WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- 本轮完整 W3C 页面：[`.research/input-feedback-wcag-color.html`](../.research/input-feedback-wcag-color.html)

### 反馈动画时序

Material 的 Easing and duration 页面给出可参考的过渡范围：标准过渡通常使用约 300ms，进入屏幕约 250ms，离开屏幕约 200ms；页面说明缓动可以避免僵硬，建议快速开始并柔和结束。对于“错误格子短暂位移和变色”，约 300 至 340ms 的一次性反馈属于小区域、短时长交互；新输入到达时应取消旧动画。

来源：

- [Material Design 3 Easing and duration](https://m3.material.io/styles/motion/easing-and-duration/overview)
- 真实页面完整文本：[`.research/input-feedback-material-motion-text.txt`](../.research/input-feedback-material-motion-text.txt)

## W3C WCAG 与 WAI-ARIA

### 错误必须有文字说明

WCAG 2.2 Success Criterion 3.3.1 要求：自动检测到输入错误时，必须识别出发生错误的项目，并用文字向用户描述错误。W3C 允许同时使用图片、颜色和其他视觉标识；该说明页明确写出唯一要求是以文字或文字替代向用户呈现错误。具体采用页面顶部、字段旁边、alert 或对话框由交互场景决定。

WCAG 3.3.3 进一步要求：当已知修正方法时，提供修正建议。对于击鼓传字，提示“答案不符合当前提示”或“这个词之前输入过了”已经说明错误类型；词库、长度和条件关系可以继续由游戏规则提示说明，不需要弹出详细规则窗口。

来源：

- [WCAG 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
- [WCAG 3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html)
- 本轮完整页面：[`.research/input-feedback-wcag-error-identification.html`](../.research/input-feedback-wcag-error-identification.html)、[`.research/input-feedback-wcag-error-suggestion.html`](../.research/input-feedback-wcag-error-suggestion.html)

### 状态消息与实时文字

WCAG 4.1.3 要求不改变焦点的状态消息可以通过角色或属性被辅助技术识别，同时强调状态消息不能过于频繁、干扰用户。`role="status"` 适合成功或普通状态；错误和警告可以使用 `role="alert"` 或 live region，但 W3C 明确把对不重要、非紧急消息使用 `role="alert"` 或 `aria-live="assertive"` 列为常见失败方式。

重复词的提示属于当前答案区域的即时状态，可以使用 `role="status" aria-live="polite"`；服务端拒绝且需要立即告知的错误可以使用同一状态区域更新文字，避免反复抢夺焦点。网站连接故障属于单独的系统错误区域。

来源：

- [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [WAI-ARIA 1.2 `aria-invalid`](https://www.w3.org/TR/wai-aria-1.2/#aria-invalid)
- [WAI-ARIA 1.2 `aria-errormessage`](https://www.w3.org/TR/wai-aria-1.2/#aria-errormessage)
- 本轮完整页面：[`.research/input-feedback-wcag-status.html`](../.research/input-feedback-wcag-status.html)、[`.research/input-feedback-aria-invalid.html`](../.research/input-feedback-aria-invalid.html)

`aria-invalid` 的官方定义是“输入值不符合应用要求的格式”；判定后可以设置为 `true`，并应在已知时提供修正建议。用户尚未提交或尚未完成输入时，不应提前设置必填字段无效状态。对于击鼓传字，答案形成完整词语并触发本地重复预提示时，属于已经有足够信息判定的时刻；删除或继续编辑后清除属性。

## 闪烁和运动风险边界

W3C WCAG 2.3.1 规定页面内容每秒不能闪烁超过三次，红色闪烁具有额外阈值。方格错误反馈应使用一次渐变或一次短促颜色过渡，避免高频开关红色背景；推荐深红边框与淡红背景短暂交替一次，再恢复原色。小幅位移使用一次左右往返，时间约 300 至 340ms，不连续振荡。

来源：

- [WCAG 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- 本轮完整页面：[`.research/input-feedback-wcag-flashes.html`](../.research/input-feedback-wcag-flashes.html)

## 研究边界与项目决定

- Apple 的资料给出了交互原则和 AppKit 的动画上下文概念，没有规定网页答案方格必须使用某一种 CSS 动画。
- 已完整读取的 Apple Feedback、Text fields、Entering data、Motion、Alerts 和 `NSAnimationContext` 资料没有说明 macOS 密码失败的具体抖动实现、时间和距离。本研究没有把密码框示例写成官方规定，也没有采样系统密码界面。
- Material 的错误字段与动画资料提供了可复用的状态结构、图标和时间范围，没有要求击鼓传字采用 Material 配色或组件外观。
- W3C 的规则关注可识别的文字、辅助技术状态和闪烁风险；它没有规定错误必须显示为页面背景、边框或方格内部。
- 当前项目保留自己的水墨风格、方格布局和原生输入方式。研究支持使用方格内部短暂闪色与位移，文字状态放在答案格下方，并确保颜色和动画都不承担唯一的信息传递职责。

