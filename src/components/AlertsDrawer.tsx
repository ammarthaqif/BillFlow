import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Settings, 
  Check, 
  Trash2,
  X
} from 'lucide-react';
import { CustomAlert } from '../types';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: CustomAlert[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  alertThresholds: number[];
  onUpdateThresholds: (thresholds: number[]) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkRead,
  onClearAll,
  alertThresholds,
  onUpdateThresholds,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(true);

  if (!isOpen) return null;

  const toggleDayThreshold = (day: number) => {
    if (alertThresholds.includes(day)) {
      if (alertThresholds.length > 1) {
        onUpdateThresholds(alertThresholds.filter((d) => d !== day));
      }
    } else {
      onUpdateThresholds([...alertThresholds, day].sort((a, b) => b - a));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl p-5 sm:p-6 flex flex-col justify-between">
          {/* Top Section */}
          <div className="space-y-4 overflow-y-auto pr-1 grow">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Upcoming Deadline Alerts</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showConfig
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Configure Alert Thresholds"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Threshold Configuration Box (Collapsible) */}
            {showConfig && (
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 space-y-3 text-xs">
                <div className="font-semibold text-slate-200">Alert Timing Rules</div>
                <p className="text-slate-400 text-[11px]">
                  Choose when BillFlow should notify you before a bill's grace period ends:
                </p>

                <div className="flex items-center gap-2">
                  {[7, 5, 3, 1].map((day) => {
                    const active = alertThresholds.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDayThreshold(day)}
                        className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                          active
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {day} Day{day === 1 ? '' : 's'} Prior
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-[11px]">
                  <span className="text-slate-300">Push Notification Simulation</span>
                  <button
                    onClick={() => setBrowserNotifEnabled(!browserNotifEnabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      browserNotifEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {browserNotifEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            )}

            {/* Alerts List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active Alerts ({alerts.length})</span>
                {alerts.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                    alert.severity === 'urgent'
                      ? 'bg-rose-950/20 border-rose-800/60 shadow-md shadow-rose-950/10'
                      : alert.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-800/50'
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {alert.severity === 'urgent' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : alert.severity === 'warning' ? (
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Bell className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      <span className="font-bold text-white text-xs">{alert.title}</span>
                    </div>

                    <button
                      onClick={() => onMarkRead(alert.id)}
                      className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                      title="Mark as Read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">{alert.message}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Deadline: {alert.dueDate}</span>
                    <span
                      className={`font-semibold ${
                        alert.daysRemaining <= 1
                          ? 'text-rose-400'
                          : alert.daysRemaining <= 3
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {alert.daysRemaining === 0
                        ? 'Due Today!'
                        : alert.daysRemaining === 1
                        ? 'Due Tomorrow'
                        : `${alert.daysRemaining} days remaining`}
                    </span>
                  </div>
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="text-center py-16 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div className="font-semibold text-white text-sm">All Clear!</div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    No urgent upcoming deadlines or high utilization warnings detected.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close Alerts Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
