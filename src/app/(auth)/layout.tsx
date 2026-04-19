import { Truck } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12 text-white">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <Truck className="h-7 w-7" />
          FretoMatch
        </Link>
        <div>
          <h1 className="text-4xl font-bold mb-4">
            Le BlaBlaCar du transport de marchandises
          </h1>
          <p className="text-blue-200 text-lg">
            Connectez chargeurs et transporteurs pour des envois moins chers,
            plus écologiques, et des trajets rentabilisés.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: '30%', desc: 'de camions roulent à vide' },
              { label: '-40%', desc: 'sur vos coûts de transport' },
              { label: '500+', desc: 'transporteurs vérifiés' },
              { label: '4.8/5', desc: 'satisfaction moyenne' },
            ].map((s) => (
              <div key={s.label} className="bg-blue-500/40 rounded-lg p-4">
                <div className="text-2xl font-bold">{s.label}</div>
                <div className="text-sm text-blue-200">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">
          © 2025 FretoMatch — Transport collaboratif en France
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="lg:hidden flex items-center gap-2 text-xl font-bold text-blue-600 mb-8">
          <Truck className="h-6 w-6" />
          FretoMatch
        </div>
        {children}
      </div>
    </div>
  )
}
