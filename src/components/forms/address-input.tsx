'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeocodedAddress } from '@/lib/mapbox'

interface AddressInputProps {
  label: string
  placeholder?: string
  error?: string
  onSelect: (address: GeocodedAddress) => void
  value?: string
}

export function AddressInput({ label, placeholder, error, onSelect, value = '' }: AddressInputProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<GeocodedAddress[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => search(q), 300)
  }

  function handleSelect(addr: GeocodedAddress) {
    setQuery(addr.place_name)
    setOpen(false)
    onSelect(addr)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder || 'Ville, adresse...'}
          className={cn(
            'w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm shadow-sm transition-colors',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
          )}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {open && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="flex items-start gap-2 w-full px-3 py-2.5 text-left hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
              >
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-800">{r.place_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
