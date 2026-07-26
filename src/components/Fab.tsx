// 右下角悬浮加号按钮。悬停久一点由原生 title 显示说明文字（不再显示「Enter」快捷键小气泡）。
export default function Fab({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="fab-wrap">
      <button className="fab" title={label} onClick={onClick}>
        ＋
      </button>
    </div>
  );
}
