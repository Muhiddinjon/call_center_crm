'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Webhook,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Server,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Get base URL from window location
    setBaseUrl(window.location.origin);
  }, []);

  const webhookUrl = `${baseUrl}/api/webhook/binotel`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Sozlamalar</h1>
        <p className="text-gray-500">Tizim sozlamalari va integratsiyalar</p>
      </div>

      <div className="space-y-6">
        {/* Binotel Integration */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Binotel Integratsiya</h2>
                <p className="text-sm text-gray-500">Binotel cloud PBX bilan bog'lanish sozlamalari</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Webhook URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Webhook className="w-4 h-4" />
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="form-input flex-1 bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                  className="btn btn-secondary px-4"
                  title="Nusxa olish"
                >
                  {copied === 'webhook' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Bu URL ni Binotel admin panelida webhook sifatida qo'shing
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-3">Webhook sozlash qo'llanmasi:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                <li>Binotel admin paneliga kiring: <a href="https://my.binotel.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">my.binotel.com <ExternalLink className="w-3 h-3" /></a></li>
                <li><strong>Sozlamalar</strong> → <strong>API va Integratsiyalar</strong> bo'limiga o'ting</li>
                <li><strong>Webhooks</strong> bo'limida yangi webhook qo'shing</li>
                <li>Yuqoridagi URL ni kiriting</li>
                <li>Quyidagi hodisalarni tanlang:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><code className="bg-blue-100 px-1 rounded">incoming-call-start</code> - Kiruvchi qo'ng'iroq boshlanganda</li>
                    <li><code className="bg-blue-100 px-1 rounded">incoming-call-end</code> - Kiruvchi qo'ng'iroq tugaganda</li>
                    <li><code className="bg-blue-100 px-1 rounded">outgoing-call-start</code> - Chiquvchi qo'ng'iroq boshlanganda</li>
                    <li><code className="bg-blue-100 px-1 rounded">outgoing-call-end</code> - Chiquvchi qo'ng'iroq tugaganda</li>
                  </ul>
                </li>
                <li>Saqlash tugmasini bosing</li>
              </ol>
            </div>

            {/* API Credentials info */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                API kalitlari
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Binotel API kalitlari server tomonida <code className="bg-gray-100 px-1 rounded">.env</code> faylida saqlanadi.
                Ularni o'zgartirish uchun server sozlamalarini yangilang.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">BINOTEL_API_KEY</div>
                  <div className="font-mono text-sm text-gray-700">••••••••••••</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">BINOTEL_API_SECRET</div>
                  <div className="font-mono text-sm text-gray-700">••••••••••••</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Server className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Tizim ma'lumotlari</h2>
                <p className="text-sm text-gray-500">Server va deployment ma'lumotlari</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Base URL</div>
                <div className="font-mono text-sm text-gray-700 break-all">{baseUrl}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Environment</div>
                <div className="font-mono text-sm text-gray-700">
                  {baseUrl.includes('localhost') ? 'Development' : 'Production'}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Database</div>
                <div className="font-mono text-sm text-gray-700">Upstash Redis</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Framework</div>
                <div className="font-mono text-sm text-gray-700">Next.js 14</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
