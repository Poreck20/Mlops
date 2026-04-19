'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Truck, Bell, Menu, X, ChevronDown, LogOut, User, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { User as UserType } from '@/types'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserType | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) return
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (data) setUser(data)
    })
  }, [pathname])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const dashboardPath = user?.role === 'CARRIER' ? '/carrier' : user?.role === 'ADMIN' ? '/admin' : '/shipper'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <Truck className="h-6 w-6" />
            FretoMatch
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/annonces" className={cn('text-sm font-medium hover:text-blue-600 transition-colors', pathname.startsWith('/annonces') ? 'text-blue-600' : 'text-gray-600')}>
              Annonces
            </Link>
            <Link href="/annonces/carte" className={cn('text-sm font-medium hover:text-blue-600 transition-colors', pathname === '/annonces/carte' ? 'text-blue-600' : 'text-gray-600')}>
              Carte
            </Link>
            {user?.role === 'SHIPPER' && (
              <Link href="/shipper/nouvelle-demande" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                + Nouvelle demande
              </Link>
            )}
            {user?.role === 'CARRIER' && (
              <Link href="/carrier/nouvelle-offre" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                + Proposer un trajet
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                  <Bell className="h-5 w-5" />
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                      {user.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:block text-sm font-medium">{user.first_name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link href={dashboardPath} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <LayoutDashboard className="h-4 w-4" /> Tableau de bord
                      </Link>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <User className="h-4 w-4" /> Mon profil
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={signOut} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">
                  Connexion
                </Link>
                <Link href="/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  S&apos;inscrire
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link href="/annonces" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annonces</Link>
            <Link href="/annonces/carte" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Carte</Link>
            {user?.role === 'SHIPPER' && (
              <Link href="/shipper/nouvelle-demande" className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">+ Nouvelle demande</Link>
            )}
            {user?.role === 'CARRIER' && (
              <Link href="/carrier/nouvelle-offre" className="block px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">+ Proposer un trajet</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
