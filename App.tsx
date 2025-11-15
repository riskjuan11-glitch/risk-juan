
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { KycData, IdCardData } from './types';
import { NORMALIZED_REMARKS, AUDITORS } from './constants';
import { extractKycDataFromImage, extractIdCardData } from './services/geminiService';

// --- Helper Functions ---
const getFormattedDate = () => {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const year = today.getFullYear().toString().slice(-2);
    return `${month}-${day}-${year}`;
};

const getInitialKycData = (auditor: string): KycData => {
    const initialData = {
      date: getFormattedDate(),
      auditor: auditor,
      member_id: null,
      name: null,
      remark_raw: '',
      remark_normalized: NORMALIZED_REMARKS[0],
      kyc_status: 'Failed',
      confidence: 0,
      fields_confidence: { member_id: 0, remark_raw: 0 },
      notes: 'Awaiting image processing.',
      csv_row: '',
      accountStatusCsvRow: '',
      manualFreezeCsvRow: '',
    };
    initialData.csv_row = formatCsvRow(initialData);
    initialData.accountStatusCsvRow = formatAccountStatusCsvRow(initialData);
    initialData.manualFreezeCsvRow = formatManualFreezeCsvRow(initialData);
    return initialData;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const formatCsvRow = (data: KycData): string => {
  const { date, auditor, member_id, remark_normalized } = data;
  const values = [
    date || '',
    auditor || '',
    member_id || '',
    remark_normalized || '',
    'Failed',
  ];
  return values.map(v => v ? v.toString().trim() : '').join('\t');
};

const formatAccountStatusCsvRow = (data: KycData): string => {
  const { date, auditor, member_id } = data;
  const accountStatus = 'Normal';
  const values = [
    date || '',
    auditor || '',
    member_id || '',
    accountStatus,
  ];
  return values.map(v => (v ? v.toString().trim() : '')).join('\t');
};

const formatManualFreezeCsvRow = (data: KycData): string => {
  const { date, auditor, member_id, remark_normalized } = data;
  const accountStatus = 'Normal';
  const typeOfRestriction = 'All Restriction';
  const values = [
    date || '',
    auditor || '',
    member_id || '',
    remark_normalized || '',
    accountStatus,
    typeOfRestriction,
  ];
  return values.map(v => (v ? v.toString().trim() : '')).join('\t');
};


// --- SVG Icons ---
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19 12 19c.996 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 2.662 10.065 6.838a10.523 10.523 0 01-1.614 3.018M11.29 11.29a3 3 0 01-4.242 0 3 3 0 010-4.242" />
        <path d="M4.5 4.5l15 15" />
    </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
    </svg>
);

const PasteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-2 4h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zm-4-4a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);


const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
);

// --- UI Components ---
interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  imagePreview: string | null;
  isLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}
const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, imagePreview, isLoading, fileInputRef }) => {
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageSelect(event.target.files[0]);
    }
  };

  useEffect(() => {
    const dropzone = dropzoneRef.current;
    
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if(e.dataTransfer?.files && e.dataTransfer.files[0]){
        onImageSelect(e.dataTransfer.files[0]);
      }
    };

    dropzone?.addEventListener('dragover', handleDragOver);
    dropzone?.addEventListener('drop', handleDrop);

    return () => {
      dropzone?.removeEventListener('dragover', handleDragOver);
      dropzone?.removeEventListener('drop', handleDrop);
    };
  }, [onImageSelect]);
  
  return (
    <div ref={dropzoneRef} className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      {imagePreview ? (
         <div className="w-full h-full relative">
            <img src={imagePreview} alt="KYC Screenshot" className="w-full h-full object-contain rounded-md" />
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <LoadingSpinner />
              </div>
            )}
         </div>
      ) : (
        <div className="text-center">
            <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Drop an image here or press <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ctrl+V</span> to paste
            </p>
            <div className="mt-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <UploadIcon className="h-4 w-4" />
                    Upload File
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

interface KycDataFormProps {
  data: KycData;
  onDataChange: (field: keyof KycData, value: string) => void;
  onReset: () => void;
}
const KycDataForm: React.FC<KycDataFormProps> = ({ data, onDataChange, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [accountStatusCopied, setAccountStatusCopied] = useState(false);
  const [manualFreezeCopied, setManualFreezeCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.csv_row).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const handleAccountStatusCopy = () => {
    navigator.clipboard.writeText(data.accountStatusCsvRow).then(() => {
      setAccountStatusCopied(true);
      setTimeout(() => setAccountStatusCopied(false), 2000);
    });
  };

  const handleManualFreezeCopy = () => {
    navigator.clipboard.writeText(data.manualFreezeCsvRow).then(() => {
      setManualFreezeCopied(true);
      setTimeout(() => setManualFreezeCopied(false), 2000);
    });
  };

  const ConfidenceBadge: React.FC<{ value: number }> = ({ value }) => {
    const percentage = (value * 100).toFixed(0);
    const colorClass = value > 0.85 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : value > 0.6 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${colorClass}`}>{percentage}%</span>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-md h-full flex flex-col space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Extracted Data</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
          <input type="text" value={data.date || ''} onChange={(e) => onDataChange('date', e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Auditor</label>
          <select value={data.auditor || ''} onChange={(e) => onDataChange('auditor', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <option value="">Select Auditor</option>
            {AUDITORS.map(auditor => <option key={auditor}>{auditor}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member ID</label>
        <div className="mt-1 flex items-center space-x-2">
          <input type="text" value={data.member_id || ''} onChange={(e) => onDataChange('member_id', e.target.value)} className="flex-grow block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
          <ConfidenceBadge value={data.fields_confidence.member_id} />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Normalized Remark</label>
        <select value={data.remark_normalized} onChange={(e) => onDataChange('remark_normalized', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          {NORMALIZED_REMARKS.map(remark => <option key={remark}>{remark}</option>)}
        </select>
      </div>

      <div className="flex-grow"></div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">KYC FAILED</label>
        <div className="mt-1 flex space-x-2">
          <input type="text" readOnly value={data.csv_row} className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-300" />
          <button onClick={handleCopy} className="inline-flex items-center px-2 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-28 justify-center">
            {copied ? <><CheckIcon className="h-5 w-5 mr-1"/> Copied!</> : <><ClipboardIcon className="h-5 w-5 mr-1"/> Copy</>}
          </button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">UNDERAGE/NDRP</label>
        <div className="mt-1 flex space-x-2">
          <input type="text" readOnly value={data.accountStatusCsvRow} className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-300" />
          <button onClick={handleAccountStatusCopy} className="inline-flex items-center px-2 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-28 justify-center">
            {accountStatusCopied ? <><CheckIcon className="h-5 w-5 mr-1"/> Copied!</> : <><ClipboardIcon className="h-5 w-5 mr-1"/> Copy</>}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Manual Freeze Account</label>
        <div className="mt-1 flex space-x-2">
          <input type="text" readOnly value={data.manualFreezeCsvRow} className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-300" />
          <button onClick={handleManualFreezeCopy} className="inline-flex items-center px-2 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-28 justify-center">
            {manualFreezeCopied ? <><CheckIcon className="h-5 w-5 mr-1"/> Copied!</> : <><ClipboardIcon className="h-5 w-5 mr-1"/> Copy</>}
          </button>
        </div>
      </div>

      <button onClick={onReset} className="w-full inline-flex justify-center py-1.5 px-3 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none">
        Process Another Image
      </button>
    </div>
  );
};


// --- KYC QA Page Component ---
interface KycQaPageProps {
  sharedKycData: KycData;
  onKycDataUpdate: React.Dispatch<React.SetStateAction<KycData>>;
  onDataChange: (field: keyof KycData, value: string) => void;
  imagePreview: string | null;
  isLoading: boolean;
  error: string | null;
  onImageSelect: (file: File) => void;
  onReset: () => void;
}
function KycQaPage({
  sharedKycData,
  onKycDataUpdate,
  onDataChange,
  imagePreview,
  isLoading,
  error,
  onImageSelect,
  onReset,
}: KycQaPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          onImageSelect(file);
        }
        break;
      }
    }
  }, [onImageSelect]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


  useEffect(() => {
    const newCsvRow = formatCsvRow(sharedKycData);
    const newAccountStatusCsvRow = formatAccountStatusCsvRow(sharedKycData);
    const newManualFreezeCsvRow = formatManualFreezeCsvRow(sharedKycData);
    if (sharedKycData.csv_row !== newCsvRow || sharedKycData.accountStatusCsvRow !== newAccountStatusCsvRow || sharedKycData.manualFreezeCsvRow !== newManualFreezeCsvRow) {
      onKycDataUpdate(prev => ({ ...prev, csv_row: newCsvRow, accountStatusCsvRow: newAccountStatusCsvRow, manualFreezeCsvRow: newManualFreezeCsvRow }));
    }
  }, [sharedKycData, onKycDataUpdate]);

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">KYC QA Assistant</h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">Streamline your QA workflow with AI-powered data extraction.</p>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ImageUploader onImageSelect={onImageSelect} imagePreview={imagePreview} isLoading={isLoading} fileInputRef={fileInputRef} />
            <KycDataForm data={sharedKycData} onDataChange={onDataChange} onReset={onReset}/>
        </main>
      </div>
    </div>
  );
}

const TELEGRAM_USERS = [
  '@AdaRiskcontrol',
  '@risk_control_po_opo',
  '@RC_xiaofeng',
  '@RC_JayJay',
  '@Csr_Ryan'
];

// --- TG Ticket Page Component ---
interface TGTicketPageProps {
  sharedKycData: KycData;
}
const TGTicketPage: React.FC<TGTicketPageProps> = ({ sharedKycData }) => {
  const [memberId, setMemberId] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState(NORMALIZED_REMARKS[0]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [ticketText, setTicketText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sharedKycData) {
      setMemberId(sharedKycData.member_id || '');
      setName(sharedKycData.name || '');
      setReason(sharedKycData.remark_normalized || NORMALIZED_REMARKS[0]);
    }
  }, [sharedKycData]);

  useEffect(() => {
    let text = `Juan365\n\nMember ID : ${memberId}\nName : ${name}\n\nReason : ${reason}`;
    if (selectedUsers.length > 0) {
      text += `\n\n${selectedUsers.join('\n')}`;
    }
    setTicketText(text);
  }, [memberId, name, reason, selectedUsers]);

  const handleUserToggle = (username: string) => {
    setSelectedUsers(prev =>
      prev.includes(username)
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(ticketText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-4">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">TG Ticket Generator</h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">Create a formatted ticket for Telegram.</p>
        </header>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member ID</label>
            <input 
              type="text" 
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              {NORMALIZED_REMARKS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag Telegram Users</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TELEGRAM_USERS.map(user => {
                const isSelected = selectedUsers.includes(user);
                return (
                  <button
                    key={user}
                    onClick={() => handleUserToggle(user)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {user}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Generated Ticket</label>
            <div className="mt-1 flex space-x-2">
                <textarea 
                    readOnly 
                    value={ticketText}
                    rows={7}
                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-300 font-mono"
                />
                 <button onClick={handleCopy} className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 justify-center">
                    {copied ? <CheckIcon className="h-5 w-5"/> : <ClipboardIcon className="h-5 w-5"/>}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- ID Scanner Page Component (Placeholder) ---
const IdScannerPage: React.FC = () => {
    const [idCardData, setIdCardData] = useState<IdCardData | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (idCardData && (idCardData.isUnderage === undefined || idCardData.isExpired === undefined)) {
            let isUnderage = false;
            if (idCardData.dateOfBirth) {
                const dob = new Date(idCardData.dateOfBirth);
                if (!isNaN(dob.getTime())) {
                    const today = new Date();
                    let age = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                        age--;
                    }
                    isUnderage = age < 21;
                }
            }

            let isExpired = false;
            if (idCardData.dateOfExpiry) {
                const doe = new Date(idCardData.dateOfExpiry);
                if (!isNaN(doe.getTime())) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    isExpired = doe < today;
                }
            }
            
            setIdCardData(prevData => prevData ? { ...prevData, isUnderage, isExpired } : null);
        }
    }, [idCardData]);


    const processIdCardImage = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        setIdCardData(null);
        try {
            const base64Image = await fileToBase64(file);
            const dataFromApi = await extractIdCardData(base64Image, file.type);
            setIdCardData(dataFromApi);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred during ID extraction.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleImageSelect = useCallback((file: File) => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
        setImageFile(file);
        setIsPreviewVisible(true);
        processIdCardImage(file);
    }, [imagePreview, processIdCardImage]);

    const handlePaste = useCallback((event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              handleImageSelect(file);
            }
            break;
          }
        }
    }, [handleImageSelect]);
    
    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    const handleReExtract = () => {
        if (imageFile) {
            processIdCardImage(imageFile);
        }
    };

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>, text: string | null, fieldName: string) => {
        e.preventDefault();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const ExtractedDataRow: React.FC<{ label: string; value: string | null; fieldName: string }> = ({ label, value, fieldName }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-500">{label}</label>
            <div className="mt-1 flex space-x-2">
                <div className="flex-grow block w-full p-2.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-gray-900 dark:text-emerald-100">
                    {value || <span className="text-gray-400">Not found</span>}
                </div>
                <button 
                    onClick={(e) => handleCopy(e, value, fieldName)}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 w-28"
                >
                    {copiedField === fieldName ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
    
    const VerificationStatus = () => {
      if (!idCardData) return null;
      const { isExpired, isUnderage } = idCardData;

      if (isExpired === undefined && isUnderage === undefined) {
          return null; 
      }

      const hasWarning = isExpired || isUnderage;

      return (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Verification Status</h3>
              <div className="space-y-2">
                  {isExpired && (
                      <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800">
                          <p className="text-sm font-medium text-red-700 dark:text-red-200">ID IS EXPIRED</p>
                      </div>
                  )}
                  {isUnderage && (
                      <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800">
                          <p className="text-sm font-medium text-red-700 dark:text-red-200">HOLDER IS UNDER 21 YEARS OLD</p>
                      </div>
                  )}
                  {!hasWarning && (
                       <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-700 dark:text-green-200">ID is valid and holder is of age.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };


    return (
        <div className="p-2">
            <div className="max-w-xl mx-auto">
                <header className="text-center mb-3">
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">ID Card Data Extractor (OCR)</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400"><span className="font-semibold">Paste (Ctrl+V) or drop an image</span> to start automatic extraction.</p>
                </header>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-3" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-md mb-3">
                    <div className="min-h-32 flex flex-col justify-center items-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 relative"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            if(e.dataTransfer?.files && e.dataTransfer.files[0]){
                                handleImageSelect(e.dataTransfer.files[0]);
                            }
                        }}
                    >
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => e.target.files && handleImageSelect(e.target.files[0])} className="hidden" />
                         {imagePreview && isPreviewVisible ? (
                            <img src={imagePreview} alt="ID Card Preview" className="max-h-40 object-contain rounded-md"/>
                         ) : (
                            <div className="text-center">
                                <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">Drop Image Here</p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">or press <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ctrl+V</span> to paste</p>
                            </div>
                         )}
                         {isLoading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                                <LoadingSpinner />
                            </div>
                         )}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                           <UploadIcon className="h-5 w-5" /> Upload
                        </button>
                        <button
                            onClick={handleReExtract}
                            disabled={!imageFile || isLoading}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300"
                        >
                            Re-Extract
                        </button>
                        <button
                            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                            disabled={!imagePreview}
                            className="inline-flex items-center justify-center p-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            {isPreviewVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
                
                {idCardData && (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-md space-y-3">
                         <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Extracted Data & Verification</h2>
                         <ExtractedDataRow label="Name (First Middle Last):" value={idCardData.name} fieldName="name" />
                         <ExtractedDataRow label="Date of Birth (DOB) - YYYY-MM-DD:" value={idCardData.dateOfBirth} fieldName="dob" />
                         <ExtractedDataRow label="ID Card Number:" value={idCardData.idNumber} fieldName="idNumber" />
                         <ExtractedDataRow label="Date of Expiry (DOE) - YYYY-MM-DD:" value={idCardData.dateOfExpiry} fieldName="doe" />
                         <VerificationStatus />
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main App Component (Router) ---
export default function App() {
  const [currentPage, setCurrentPage] = useState<'kyc' | 'tgTicket' | 'idScanner'>('kyc');
  
  // State lifted from KycQaPage to preserve it across navigation
  const [sharedKycData, setSharedKycData] = useState<KycData>(() => getInitialKycData(AUDITORS[0]));
  const [lastAuditor, setLastAuditor] = useState<string>(AUDITORS[0]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [kycIsLoading, setKycIsLoading] = useState<boolean>(false);
  const [kycError, setKycError] = useState<string | null>(null);

  // Handlers for KycQaPage, now living in the main App component
  const resetKycState = useCallback(() => {
    setSharedKycData(getInitialKycData(lastAuditor));
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setKycIsLoading(false);
    setKycError(null);
  }, [imagePreview, lastAuditor]);

  const processKycImage = useCallback(async (file: File) => {
    setKycIsLoading(true);
    setKycError(null);
    try {
      const base64Image = await fileToBase64(file);
      const dataFromApi = await extractKycDataFromImage(base64Image, file.type);
      
      const formattedDate = getFormattedDate();

      const fullData: KycData = {
          ...getInitialKycData(lastAuditor),
          ...dataFromApi,
          date: dataFromApi.date || formattedDate,
          auditor: dataFromApi.auditor || lastAuditor,
          kyc_status: dataFromApi.kyc_status || 'Failed',
      };
      
      setSharedKycData(fullData);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setKycError(err.message);
      } else {
        setKycError("An unexpected error occurred.");
      }
    } finally {
      setKycIsLoading(false);
    }
  }, [lastAuditor]);

  const handleKycImageSelect = useCallback((file: File) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setSharedKycData(getInitialKycData(lastAuditor)); // Reset data for new image
    setKycError(null);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    processKycImage(file);
  }, [imagePreview, lastAuditor, processKycImage]);

  const handleKycDataChange = (field: keyof KycData, value: string) => {
    if (field === 'auditor') {
      setLastAuditor(value);
    }
    setSharedKycData(prev => ({ ...prev, [field]: value }));
  };

  const NavButton: React.FC<{ page: 'kyc' | 'tgTicket' | 'idScanner'; label: string }> = ({ page, label }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => setCurrentPage(page)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
       <nav className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center space-x-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white mr-auto">KYC Tools</h1>
          <NavButton page="kyc" label="QA Assistant" />
          <NavButton page="tgTicket" label="TG Ticket" />
          <NavButton page="idScanner" label="ID Scanner" />
        </div>
      </nav>
      <div>
        {currentPage === 'kyc' && <KycQaPage 
            sharedKycData={sharedKycData} 
            onKycDataUpdate={setSharedKycData}
            onDataChange={handleKycDataChange}
            imagePreview={imagePreview}
            isLoading={kycIsLoading}
            error={kycError}
            onImageSelect={handleKycImageSelect}
            onReset={resetKycState}
        />}
        {currentPage === 'tgTicket' && <TGTicketPage sharedKycData={sharedKycData} />}
        {currentPage === 'idScanner' && <IdScannerPage />}
      </div>
    </div>
  );
}
