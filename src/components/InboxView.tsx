// 0.1.19：列表视图合并后，Inbox 入口薄壳，渲染 GenericListView(mode="inbox")。
import GenericListView from "./GenericListView";

export default function InboxView() {
  return <GenericListView mode="inbox" />;
}
