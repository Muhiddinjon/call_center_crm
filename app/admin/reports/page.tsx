'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  RefreshCw,
  PhoneIncoming,
  PhoneOutgoing,
  Car,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Share2,
  MessageSquare,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import type { CallLog, ReportStats } from '@/lib/types';
import { REGIONS } from '@/lib/types';
import { formatPhone, formatDuration, cn } from '@/lib/utils';

interface ExpandedRowData {
  audioUrl?: string;
  loading: boolean;
  error?: string;
}

export default function ReportsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Record<string, ExpandedRowData>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Editing notes
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [region, setRegion] = useState('');
  const [callType, setCallType] = useState('');
  const [callerType, setCallerType] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (region) params.set('region', region);
      if (callType) params.set('callType', callType);
      if (callerType) params.set('callerType', callerType);
      if (phoneNumber) params.set('phoneNumber', phoneNumber);
      params.set('limit', '500');

      const response = await fetch(`/api/admin/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (region) params.set('region', region);
    if (callType) params.set('callType', callType);
    if (callerType) params.set('callerType', callerType);

    window.open(`/api/admin/export?${params}`, '_blank');
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setRegion('');
    setCallType('');
    setCallerType('');
    setPhoneNumber('');
  };

  // Toggle row expansion
  const toggleRow = async (callId: string) => {
    if (expandedRows[callId]) {
      setExpandedRows(prev => {
        const newRows = { ...prev };
        delete newRows[callId];
        return newRows;
      });
      // Stop audio if playing
      if (playingAudio === callId) {
        audioRef.current?.pause();
        setPlayingAudio(null);
      }
    } else {
      // Fetch audio URL
      setExpandedRows(prev => ({
        ...prev,
        [callId]: { loading: true }
      }));

      try {
        const response = await fetch(`/api/calls/${callId}/audio`);
        if (response.ok) {
          const data = await response.json();
          setExpandedRows(prev => ({
            ...prev,
            [callId]: { loading: false, audioUrl: data.audioUrl }
          }));
        } else {
          setExpandedRows(prev => ({
            ...prev,
            [callId]: { loading: false, error: 'Audio topilmadi' }
          }));
        }
      } catch {
        setExpandedRows(prev => ({
          ...prev,
          [callId]: { loading: false, error: 'Xatolik yuz berdi' }
        }));
      }
    }
  };

  // Play/Pause audio
  const toggleAudio = (callId: string, audioUrl: string) => {
    if (playingAudio === callId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(callId);
      }
    }
  };

  // Download audio
  const downloadAudio = async (audioUrl: string, callId: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `call-${callId}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share audio
  const shareAudio = async (audioUrl: string, call: CallLog) => {
    const shareData = {
      title: `Qo'ng'iroq: ${formatPhone(call.phoneNumber)}`,
      text: `${format(new Date(call.callStart), 'dd.MM.yyyy HH:mm')} - ${call.driverName || call.phoneNumber}`,
      url: audioUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(audioUrl);
      alert('Audio URL nusxalandi!');
    }
  };

  // Edit notes
  const startEditNotes = (call: CallLog) => {
    setEditingNotes(call.id);
    setNotesValue(call.notes || '');
  };

  const saveNotes = async (callId: string) => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });

      if (response.ok) {
        setCalls(prev => prev.map(c =>
          c.id === callId ? { ...c, notes: notesValue } : c
        ));
        setEditingNotes(null);
      }
    } catch (error) {
      console.error('Save notes error:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  const cancelEditNotes = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  return (
    <div className="p-8">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudio(null)}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hisobotlar</h1>
          <p className="text-gray-600">Qo&apos;ng&apos;iroqlar bo&apos;yicha batafsil ma&apos;lumot</p>
        </div>
        <button
          onClick={handleExport}
          className="btn btn-success flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          CSV yuklab olish
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-header flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filterlar
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Date from */}
            <div>
              <label className="form-label">Boshlanish sanasi</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="form-label">Tugash sanasi</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Region */}
            <div>
              <label className="form-label">Viloyat</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="form-select"
              >
                <option value="">Barchasi</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Call type */}
            <div>
              <label className="form-label">Qo&apos;ng&apos;iroq turi</label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                className="form-select"
              >
                <option value="">Barchasi</option>
                <option value="incoming">Kiruvchi</option>
                <option value="outgoing">Chiquvchi</option>
              </select>
            </div>

            {/* Caller type */}
            <div>
              <label className="form-label">Kim qo&apos;ng&apos;iroq qildi</label>
              <select
                value={callerType}
                onChange={(e) => setCallerType(e.target.value)}
                className="form-select"
              >
                <option value="">Barchasi</option>
                <option value="driver">Driver</option>
                <option value="client">Mijoz</option>
              </select>
            </div>

            {/* Phone number */}
            <div>
              <label className="form-label">Telefon raqam</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="998..."
                className="form-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Qidirish
            </button>
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              Tozalash
            </button>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.totalCalls}</div>
            <div className="text-sm text-gray-500">Jami</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.incomingCalls}</div>
            <div className="text-sm text-gray-500">Kiruvchi</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.outgoingCalls}</div>
            <div className="text-sm text-gray-500">Chiquvchi</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.driverCalls}</div>
            <div className="text-sm text-gray-500">Driver</div>
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Natijalar
          <span className="badge badge-blue ml-auto">{calls.length} ta</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Sana/Vaqt</th>
                <th>Telefon</th>
                <th>Turi</th>
                <th>Driver/Client</th>
                <th>Driver</th>
                <th>Viloyat</th>
                <th>Mavzu</th>
                <th>Operator</th>
                <th>Davomiylik</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    Ma&apos;lumot topilmadi
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <>
                    <tr
                      key={call.id}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50 transition-colors',
                        expandedRows[call.id] && 'bg-blue-50'
                      )}
                      onClick={() => toggleRow(call.id)}
                    >
                      <td className="text-center">
                        {expandedRows[call.id] ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        {format(new Date(call.callStart), 'dd.MM.yyyy HH:mm')}
                      </td>
                      <td className="font-medium">{formatPhone(call.phoneNumber)}</td>
                      <td>
                        <span className={cn(
                          'badge',
                          call.callType === 'incoming' ? 'badge-green' : 'badge-blue'
                        )}>
                          {call.callType === 'incoming' ? (
                            <><PhoneIncoming className="w-3 h-3 mr-1" />Kiruvchi</>
                          ) : (
                            <><PhoneOutgoing className="w-3 h-3 mr-1" />Chiquvchi</>
                          )}
                        </span>
                      </td>
                      <td>
                        {call.isDriver ? (
                          <span className="badge badge-yellow">
                            <Car className="w-3 h-3 mr-1" />Driver
                          </span>
                        ) : call.callerType === 'client' ? (
                          <span className="badge badge-blue">Mijoz</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        {call.driverName ? (
                          <div>
                            <div className="font-medium">{call.driverName}</div>
                            <div className="text-xs text-gray-500">ID: {call.driverId}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>{call.region || <span className="text-gray-400">-</span>}</td>
                      <td>{call.topic || <span className="text-gray-400">-</span>}</td>
                      <td>{call.operatorName || <span className="text-gray-400">-</span>}</td>
                      <td>
                        {call.callDuration
                          ? formatDuration(call.callDuration)
                          : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedRows[call.id] && (
                      <tr key={`${call.id}-expanded`} className="bg-gray-50">
                        <td colSpan={10} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Audio section */}
                            <div className="bg-white rounded-lg p-4 border">
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <Play className="w-4 h-4" />
                                Audio yozuvi
                              </h4>

                              {expandedRows[call.id].loading ? (
                                <div className="flex items-center justify-center py-4">
                                  <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                              ) : expandedRows[call.id].error ? (
                                <p className="text-gray-500 text-sm">{expandedRows[call.id].error}</p>
                              ) : expandedRows[call.id].audioUrl ? (
                                <div className="space-y-3">
                                  {/* Audio player */}
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAudio(call.id, expandedRows[call.id].audioUrl!);
                                      }}
                                      className={cn(
                                        'p-3 rounded-full transition-colors',
                                        playingAudio === call.id
                                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                                      )}
                                    >
                                      {playingAudio === call.id ? (
                                        <Pause className="w-5 h-5" />
                                      ) : (
                                        <Play className="w-5 h-5" />
                                      )}
                                    </button>
                                    <span className="text-sm text-gray-600">
                                      {playingAudio === call.id ? 'Ijro etilmoqda...' : 'Tinglash'}
                                    </span>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadAudio(expandedRows[call.id].audioUrl!, call.id);
                                      }}
                                      className="btn btn-secondary btn-sm flex items-center gap-1"
                                    >
                                      <Download className="w-4 h-4" />
                                      Yuklab olish
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        shareAudio(expandedRows[call.id].audioUrl!, call);
                                      }}
                                      className="btn btn-secondary btn-sm flex items-center gap-1"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      Ulashish
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">Audio topilmadi</p>
                              )}
                            </div>

                            {/* Notes section */}
                            <div className="bg-white rounded-lg p-4 border">
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Izoh
                                {editingNotes !== call.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditNotes(call);
                                    }}
                                    className="ml-auto p-1.5 hover:bg-gray-100 rounded text-gray-500"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </h4>

                              {editingNotes === call.id ? (
                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                  <textarea
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    className="form-input min-h-[100px]"
                                    placeholder="Izoh yozing..."
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => saveNotes(call.id)}
                                      disabled={savingNotes}
                                      className="btn btn-primary btn-sm flex items-center gap-1"
                                    >
                                      {savingNotes ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Save className="w-4 h-4" />
                                      )}
                                      Saqlash
                                    </button>
                                    <button
                                      onClick={cancelEditNotes}
                                      className="btn btn-secondary btn-sm flex items-center gap-1"
                                    >
                                      <X className="w-4 h-4" />
                                      Bekor
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-600 text-sm whitespace-pre-wrap">
                                  {call.notes || <span className="text-gray-400 italic">Izoh yo&apos;q</span>}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Driver extra info */}
                          {call.driverExtraInfo && (
                            <div className="mt-4 bg-white rounded-lg p-4 border">
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                Driver qo&apos;shimcha ma&apos;lumotlari
                              </h4>
                              <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                                {JSON.stringify(call.driverExtraInfo, null, 2)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
