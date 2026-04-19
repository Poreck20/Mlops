import Link from 'next/link'
import { Truck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold">
            <Truck className="h-5 w-5" />
            FretoMatch
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-gray-500">
            <Link href="/cgu" className="hover:text-gray-700">CGU</Link>
            <Link href="/privacy" className="hover:text-gray-700">Confidentialité</Link>
            <Link href="/contact" className="hover:text-gray-700">Contact</Link>
            <Link href="/aide" className="hover:text-gray-700">Aide</Link>
          </nav>
          <p className="text-sm text-gray-400">© 2025 FretoMatch</p>
        </div>
      </div>
    </footer>
  )
}
