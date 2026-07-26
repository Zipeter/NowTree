// 0.1.20：数据管理弹窗（备份与恢复，从左侧 ☰ 菜单进入）。
// 导出 / 导入逻辑复用 App 的 handleExport / handleImport（经 Tauri 系统文件选择器）。
import Modal from "./common/Modal";

interface DataModalProps {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function DataModal({ onExport, onImport, onReset, onClose }: DataModalProps) {
  return (
    <Modal title="数据管理" onClose={onClose}>
      <p className="muted shortcut-tip">
        数据保存在本机 SQLite 数据库。导出可备份为文件，导入可恢复此前备份。
      </p>
      <div className="data-actions">
        <button type="button" className="btn-primary" onClick={onExport}>
          ⬆ 导出备份
        </button>
        <button type="button" className="btn-ghost" onClick={onImport}>
          ⬇ 导入备份
        </button>
        <button type="button" className="btn-danger" onClick={onReset}>
          清空数据
        </button>
      </div>
      <p className="muted data-warn">
        ⚠️ 导入将以备份内容<strong>覆盖当前全部数据</strong>，且不可撤销，请确认后再操作。
      </p>
      <p className="muted data-warn">
        ⚠️ 清空数据将<strong>永久删除所有事务</strong>（含 Inbox / Next / Project / 回收站），不可撤销；建议先导出备份。
      </p>
    </Modal>
  );
}
