import React from 'react';
import { PRESET_TEMPLATES } from '../../utils/presets';
import { AppConfig } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  currentAppName: string;
  onApplyTemplate: (config: AppConfig) => void;
  onClose: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  currentAppName,
  onApplyTemplate,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={22} />
              Pre-Designed Android App Templates
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select any architecture to instantly reconfigure the splash screen, menu, top bar, and main content.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close templates modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto p-1 my-4 flex-1">
          {PRESET_TEMPLATES.map((tmpl) => {
            const isMatch = currentAppName === tmpl.config.appName;
            return (
              <div
                key={tmpl.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  isMatch
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-lg'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: tmpl.config.themeColor }}
                      >
                        {renderAppIcon(tmpl.config.appLogo.icon, 24)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base leading-tight">
                          {tmpl.name}
                        </h4>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 font-mono mt-1 inline-block">
                          {tmpl.tag}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {tmpl.description}
                  </p>

                  {/* Highlights */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Navigation</span>
                      <strong className="text-slate-200 capitalize">
                        {tmpl.config.navigation.type}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Content View</span>
                      <strong className="text-slate-200 capitalize">
                        {tmpl.config.contentMode === 'website' ? 'Webview URL' : 'Launchpad Grid'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Splash Duration</span>
                      <strong className="text-slate-200">
                        {tmpl.config.splashScreen.durationSeconds}s
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Top Bar Sharing</span>
                      <strong className="text-slate-200">
                        {tmpl.config.topBar.showShareButton ? 'Enabled' : 'Disabled'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-500 font-mono">
                    {tmpl.config.appPackageId}
                  </span>
                  <button
                    onClick={() => {
                      onApplyTemplate(tmpl.config);
                      onClose();
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      isMatch
                        ? 'bg-slate-700 text-slate-300 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    }`}
                  >
                    {isMatch ? (
                      <>
                        <Check size={14} />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <span>Apply Template</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
