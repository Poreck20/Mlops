'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, MapPin, Save, Truck, Package, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import type { User as UserType } from '@/types'

const schema = z.object({
  first_name: z.string().min(2, 'Requis'),
  last_name: z.string().min(2, 'Requis'),
  phone: z.string().optional(),
  city: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      if (data) {
        setUser(data)
        reset({ first_name: data.first_name, last_name: data.last_name, phone: data.phone || '', city: data.city || '' })
      }
      setLoading(false)
    })
  }, [router, reset])

  async function onSubmit(data: FormData) {
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('users')
      .update({ first_name: data.first_name, last_name: data.last_name, phone: data.phone, city: data.city })
      .eq('id', user!.id)
    if (err) { setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setUser((u) => u ? { ...u, ...data } : u)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!user) return null

  const dashboardPath = user.role === 'CARRIER' ? '/carrier' : '/shipper'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
          {user.first_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.first_name} {user.last_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.role === 'CARRIER' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {user.role === 'CARRIER' ? <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Transporteur</span> : <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Expéditeur</span>}
            </span>
            {user.avg_rating && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> {user.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><User className="h-4 w-4" /> Informations personnelles</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prénom" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Nom" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                <Mail className="h-4 w-4" /> {user.email}
              </div>
              <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
            </div>
            <Input label="Téléphone" placeholder="+33 6 00 00 00 00" {...register('phone')} />
            <Input label="Ville" placeholder="Paris" {...register('city')} />

            {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            {saved && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">Profil mis à jour ✓</div>}

            <Button type="submit" loading={isSubmitting} className="flex items-center gap-2">
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Tableau de bord</p>
            <p className="text-sm text-gray-500">Gérer vos {user.role === 'CARRIER' ? 'offres et réservations' : 'demandes et réservations'}</p>
          </div>
          <Button variant="secondary" onClick={() => router.push(dashboardPath)}>
            Accéder →
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
