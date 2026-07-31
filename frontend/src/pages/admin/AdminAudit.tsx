/**
 * Admin audit log — read-only list of all audit entries.
 */
import { useEffect, useState } from 'react';
import { miscApi } from '../../api/client';
import { fmtDateTime } from '../../components/ui';

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    miscApi.auditLogs(200).then((l) => setLogs(l)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="page-title">Audit Log</h1>
      {loading ? <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div> : logs.length === 0 ? (
        <div className="empty-state"><i className="fa-solid fa-list-check" /><p>No audit entries</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{fmtDateTime(l.created_at)}</td>
                <td>#{l.actor_id ?? 'system'}</td>
                <td><span className="badge badge-blue">{l.action}</span></td>
                <td>{l.entity_type} #{l.entity_id ?? '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.details ? JSON.stringify(l.details).slice(0, 80) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
