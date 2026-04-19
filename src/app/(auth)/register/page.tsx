'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Truck, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  first_name: z.string().min(2, 'Requis'),
  last_name: z.string().min(2, 'Requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm_password: z.string(),
  role: z.enum(['SHIPPER', 'CARRIER']),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const initialRole = (searchParams.get('role') === 'CARRIER' ? 'CARRIER' : 'SHIPPER') as 'SHIPPER' | 'CARRIER'
  const [role, setRole] = useState<'SHIPPER' | 'CARRIER'>(initialRole)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role: initialRole },
  })

  useEffect(() => {
    setValue('role', initialRole)
    setRole(initialRole)
  }, [initialRole, setValue])

  function selectRole(r: 'SHIPPER' | 'CARRIER') {
    setRole(r)
    setValue('role', r)
  }

  async function onSubmit(data: FormData) {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
        },
      },
    })
    if (error) {
      setError(error.message)
      return
    }
    router.push(data.role === 'CARRIER' ? '/carrier' : '/shipper')
  }

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
      <p className="text-gray-500 mb-6">
        Déjà inscrit ?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Se connecter
        </Link>
      </p>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {([
          { value: 'SHIPPER', label: "J'envoie des marchandises", icon: Package, desc: 'Chargeur / Expéditeur' },
          { value: 'CARRIER', label: "Je transporte", icon: Truck, desc: 'Transporteur / Conducteur' },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectRole(opt.value)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all',
              role === opt.value
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            )}
          >
            <opt.icon className="h-6 w-6" />
            <span className="text-xs font-semibold">{opt.desc}</span>
            <span className="text-xs text-gray-500">{opt.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" placeholder="Marie" error={errors.first_name?.message} {...register('first_name')} />
          <Input label="Nom" placeholder="Dupont" error={errors.last_name?.message} {...register('last_name')} />
        </div>
        <Input label="Email" type="email" placeholder="vous@exemple.fr" error={errors.email?.message} {...register('email')} />
        <Input label="Mot de passe" type="password" placeholder="••••••••" hint="Minimum 8 caractères" error={errors.password?.message} {...register('password')} />
        <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" error={errors.confirm_password?.message} {...register('confirm_password')} />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Créer mon compte
        </Button>
      </form>

      <p className="mt-4 text-xs text-gray-400 text-center">
        En créant un compte, vous acceptez nos{' '}
        <Link href="/cgu" className="underline">CGU</Link> et notre{' '}
        <Link href="/privacy" className="underline">politique de confidentialité</Link>.
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md animate-pulse" />}>
      <RegisterForm />
    </Suspense>
  )
}
