// 0.1.19：列表视图合并后，类别（waiting/someday/next_action）入口薄壳，渲染 GenericListView。
import GenericListView from "./GenericListView";
import type { Category } from "../types/transaction";

export default function CategoryListView({ category }: { category: Category }) {
  return <GenericListView mode={category} />;
}
