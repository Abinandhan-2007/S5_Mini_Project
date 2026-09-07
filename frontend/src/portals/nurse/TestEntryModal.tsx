// frontend/src/portals/nurse/TestEntryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Microscope,
} from 'lucide-react';
import { nurseService } from '../../services/nurseService';
import type { NurseQueueItem, LabTestRecord, LabTestFormData } from '../../types/nurse';

interface TestEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueItem: NurseQueueItem | null;
  onSuccess: () => void;
}

const COMMON_TEST_TYPES = [
  'Point-of-Care Blood Glucose',
  'Complete Blood Count (CBC)',
  'Lipid Panel (Cholesterol)',
  'Rapid COVID-19 / Influenza Antigen',
  'Urine Dipstick Urinalysis',
  'Electrocardiogram (ECG / EKG)',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT / Creatinine)',
  'Other Diagnostic Test'
];

export const TestEntryModal: React.FC<TestEntryModalProps> = ({
  isOpen,
  onClose,
  queueItem,
  onSuccess,
}) => {
  const [testType, setTestType] = useState<string>(COMMON_TEST_TYPES[0]);
  const [customTestType, setCustomTestType] = useState<string>('');
  const [freeTextResult, setFreeTextResult] = useState<string>('');

  // Structured key-value fields
  const [paramRows, setParamRows] = useState<Array<{ key: string; value: string; unit: string }>>([
    { key: '', value: '', unit: '' }
  ]);

  // Report File Upload State (base64 pattern)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Existing tests list
  const [existingTests, setExistingTests] = useState<LabTestRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch existing tests on open
  useEffect(() => {
    if (isOpen && queueItem) {
      loadExistingTests();
      resetForm();
    }
  }, [isOpen, queueItem]);

  const loadExistingTests = async () => {
    if (!queueItem) return;
    try {
      const tests = await nurseService.getLabTests(queueItem.appointment_id);
      setExistingTests(tests);
    } catch (err) {
      console.warn('Could not load tests:', err);
    }
  };

  const resetForm = () => {
    setTestType(COMMON_TEST_TYPES[0]);
    setCustomTestType('');
    setFreeTextResult('');
    setParamRows([{ key: '', value: '', unit: '' }]);
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setUploadError(null);
    setStatusMessage(null);
  };

  if (!isOpen || !queueItem) return null;

  // Handle Base64 File Upload (preserving established pattern)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB size limit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await nurseService.uploadReport(
          base64Data,
          file.name,
          queueItem.appointment_id
        );
        setUploadedFileUrl(res.file_url);
        setUploadedFileName(file.name);
        setIsUploading(false);
      } catch (err: any) {
        setUploadError(err.message || 'File upload failed.');
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Error reading file data.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddRow = () => {
    setParamRows([...paramRows, { key: '', value: '', unit: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setParamRows(paramRows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: 'key' | 'value' | 'unit', val: string) => {
    const updated = [...paramRows];
    updated[index][field] = val;
    setParamRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const effectiveType = testType === 'Other Diagnostic Test' ? (customTestType || 'Diagnostic Test') : testType;

    // Build structured JSON
    const structured: Record<string, any> = {};
    paramRows.forEach((r) => {
      if (r.key.trim()) {
        structured[r.key.trim()] = {
          value: r.value.trim(),
          unit: r.unit.trim()
        };
      }
    });

    try {
      const payload: LabTestFormData = {
        appointment_id: queueItem.appointment_id,
        patient_id: queueItem.patient.id,
        test_type: effectiveType,
        structured_results: structured,
        free_text_result: freeTextResult.trim() || undefined,
        file_url: uploadedFileUrl || undefined,
        status: 'completed'
      };

      await nurseService.recordLabTest(payload);
      setIsSubmitting(false);
      setStatusMessage('Test result recorded successfully!');
      resetForm();
      loadExistingTests();
      onSuccess();
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMessage(err.message || 'Failed to record test.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0B5A54] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Microscope className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-black font-heading tracking-tight">Diagnostic & Lab Tests</h2>
              <p className="text-xs text-teal-200/80">
                Pre-Consultation Test Entry &bull; {queueItem.patient.name} (#{queueItem.token_number})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing Tests Accordion/List */}
          {existingTests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Tests Recorded for this Appointment ({existingTests.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {existingTests.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{t.test_type}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] uppercase">
                        {t.status}
                      </span>
                    </div>
                    {t.free_text_result && (
                      <p className="text-[11px] text-slate-600 italic font-medium line-clamp-2">
                        "{t.free_text_result}"
                      </p>
                    )}
                    {t.file_url && (
                      <a
                        href={t.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#0B5A54] hover:underline font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Attached Report
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Test Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Record New Diagnostic Result
            </h3>

            {/* Test Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Test Category</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 cursor-pointer"
                >
                  {COMMON_TEST_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {testType === 'Other Diagnostic Test' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Custom Test Name</label>
                  <input
                    type="text"
                    required
                    value={customTestType}
                    onChange={(e) => setCustomTestType(e.target.value)}
                    placeholder="e.g. Rapid Ferritin Panel"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
                  />
                </div>
              )}
            </div>

            {/* Structured Findings (Key / Value / Unit) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600">
                  Biomarker Parameters (Optional Key-Values)
                </label>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-[11px] font-bold text-[#0B5A54] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Parameter
                </button>
              </div>

              <div className="space-y-2">
                {paramRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Parameter (e.g. Hemoglobin)"
                      value={row.key}
                      onChange={(e) => handleRowChange(idx, 'key', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5A54]"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 14.2)"
                      value={row.value}
                      onChange={(e) => handleRowChange(idx, 'value', e.target.value)}
                      className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5A54]"
                    />
                    <input
                      type="text"
                      placeholder="Unit (g/dL)"
                      value={row.unit}
                      onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                      className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5A54]"
                    />
                    {paramRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Free Text Findings */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Diagnostic Summary / Rapid Test Result
              </label>
              <textarea
                rows={2}
                value={freeTextResult}
                onChange={(e) => setFreeTextResult(e.target.value)}
                placeholder="e.g. Normal sinus rhythm on 12-lead ECG. No ST-segment elevation. Negative for COVID-19 antigen."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20"
              />
            </div>

            {/* Document / Report Upload via Base64 (Requirement 3) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Attach Diagnostic Report (Image or PDF)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs">
                  <UploadCloud className="w-4 h-4 text-[#0B5A54]" />
                  <span>{isUploading ? 'Encoding & Uploading...' : 'Choose File (Base64)'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={isUploading}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {uploadedFileName && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{uploadedFileName}</span>
                  </span>
                )}
              </div>
              {uploadError && (
                <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
              )}
            </div>

            {/* Status / Error feedback */}
            {statusMessage && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-bold">
                {statusMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-5 py-2 rounded-xl bg-[#0B5A54] hover:bg-[#084540] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Saving Test...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Diagnostic Result</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
