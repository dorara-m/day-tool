import { useState } from "react";
import { createEmptyPlanTask, createEmptyPlanGroup } from "./planUtils";

/**
 * プロジェクト（グループ）＋作業内容の入力パネル。朝タブ・夕タブで共用。
 * scopeLabel/scopePlaceholder で「対応範囲」「対応結果」など文脈を切り替える。
 */
export default function GroupsPanel({
  groups,
  setGroups,
  hint,
  groupPlaceholder = "プロジェクト名（ex: 案件A）",
  taskPlaceholder = "作業内容（ex: 追加FB対応）",
  scopeLabel = "対応範囲",
  scopePlaceholder = "対応範囲（ex: 先方報告まで）",
  addGroupLabel = "プロジェクトを追加",
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const moveGroup = (draggedGroupId, targetGroupId) => {
    if (draggedGroupId == null || draggedGroupId === targetGroupId) return;
    setGroups((current) => {
      const fromIndex = current.findIndex((g) => g.id === draggedGroupId);
      const toIndex = current.findIndex((g) => g.id === targetGroupId);
      if (fromIndex === -1 || toIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const updateGroup = (groupId, field, value) => {
    setGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, [field]: value } : g)),
    );
  };

  const addGroup = () => {
    setGroups((current) => [...current, createEmptyPlanGroup()]);
  };

  const removeGroup = (groupId) => {
    setGroups((current) => current.filter((g) => g.id !== groupId));
  };

  const updateTask = (groupId, taskId, field, value) => {
    setGroups((current) =>
      current.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === taskId ? { ...t, [field]: value } : t,
              ),
            },
      ),
    );
  };

  const addTask = (groupId) => {
    setGroups((current) =>
      current.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, tasks: [...g.tasks, createEmptyPlanTask()] },
      ),
    );
  };

  const removeTask = (groupId, taskId) => {
    setGroups((current) =>
      current.map((g) => {
        if (g.id !== groupId) return g;
        const next = g.tasks.filter((t) => t.id !== taskId);
        return { ...g, tasks: next.length > 0 ? next : [createEmptyPlanTask()] };
      }),
    );
  };

  return (
    <section className="panel">
      {hint && <p className="panel-hint">{hint}</p>}
      <div id="groups" className="tasks">
        {groups.map((group) => (
          <div
            key={group.id}
            className={`task plan-group${draggedId === group.id ? " plan-group--dragging" : ""}${dragOverId === group.id ? " plan-group--drag-over" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragOverId(group.id)}
            onDragLeave={() =>
              setDragOverId((current) => (current === group.id ? null : current))
            }
            onDrop={(e) => {
              e.preventDefault();
              moveGroup(draggedId, group.id);
              setDragOverId(null);
            }}
          >
            <div className="task-remove">
              <button
                type="button"
                onClick={() => removeGroup(group.id)}
                aria-label="このプロジェクトを削除"
              >
                ー
              </button>
            </div>
            <div className="plan-group-header">
              <span
                className="drag-handle"
                draggable
                onDragStart={() => setDraggedId(group.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                aria-label="ドラッグして並び替え"
                title="ドラッグして並び替え"
              >
                ⠿
              </span>
              <input
                type="text"
                className="task-name plan-group-name"
                placeholder={groupPlaceholder}
                value={group.name}
                onChange={(e) => updateGroup(group.id, "name", e.target.value)}
              />
            </div>
            <div className="plan-tasks">
              {group.tasks.map((task) => (
                <div key={task.id} className="plan-task">
                  <div className="plan-task-row1">
                    <input
                      type="text"
                      className="task-name"
                      placeholder={taskPlaceholder}
                      value={task.name}
                      onChange={(e) =>
                        updateTask(group.id, task.id, "name", e.target.value)
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="task-hours"
                      placeholder="時間(h)"
                      value={task.hours}
                      onChange={(e) =>
                        updateTask(group.id, task.id, "hours", e.target.value)
                      }
                    />
                  </div>
                  <div className="plan-task-row2">
                    <div className="progress-range">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="10"
                        className="progress-input"
                        placeholder="0"
                        value={task.progressStart}
                        onChange={(e) =>
                          updateTask(
                            group.id,
                            task.id,
                            "progressStart",
                            e.target.value,
                          )
                        }
                      />
                      <span>%　→</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="10"
                        className="progress-input"
                        placeholder="100"
                        value={task.progressEnd}
                        onChange={(e) =>
                          updateTask(
                            group.id,
                            task.id,
                            "progressEnd",
                            e.target.value,
                          )
                        }
                      />
                      <span>%</span>
                    </div>
                    <input
                      type="text"
                      className="task-status plan-scope"
                      placeholder={scopePlaceholder}
                      value={task.scope}
                      onChange={(e) =>
                        updateTask(group.id, task.id, "scope", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="child-remove"
                    onClick={() => removeTask(group.id, task.id)}
                    aria-label="作業内容を削除"
                  >
                    ー
                  </button>
                </div>
              ))}
              <div className="secondary_add">
                <button
                  type="button"
                  className="secondary child-add"
                  onClick={() => addTask(group.id)}
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="add_task">
        <button type="button" className="secondary" onClick={addGroup}>
          {addGroupLabel}
        </button>
      </div>
    </section>
  );
}
