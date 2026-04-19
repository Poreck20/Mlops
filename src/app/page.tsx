import Link from 'next/link'
import { Truck, Package, MapPin, Shield, Star, ArrowRight, CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Le BlaBlaCar du transport<br />de marchandises
            </h1>
            <p className="text-blue-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Envoyez vos marchandises à moindre coût avec des transporteurs
              qui passent déjà par votre trajet. Simple, fiable, transparent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register?role=SHIPPER"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors text-lg"
              >
                <Package className="h-5 w-5" />
                J&apos;envoie une marchandise
              </Link>
              <Link
                href="/register?role=CARRIER"
                className="inline-flex items-center gap-2 bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-400 transition-colors text-lg border border-blue-400"
              >
                <Truck className="h-5 w-5" />
                Je transporte
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white py-10 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Transporteurs vérifiés', value: '500+' },
              { label: 'Transports réalisés', value: '2 400+' },
              { label: 'Économie moyenne', value: '-38%' },
              { label: 'Satisfaction', value: '4.8 / 5' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-blue-600">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Comment ça marche ?</h2>
            <div className="grid md:grid-cols-2 gap-12">
              {/* Shipper */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Package className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Pour les chargeurs</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Publiez votre demande', desc: 'Décrivez votre marchandise, votre trajet et votre date souhaitée.' },
                    { step: '2', title: 'Recevez des propositions', desc: 'Des transporteurs compatibles avec votre trajet vous contactent.' },
                    { step: '3', title: 'Choisissez et payez', desc: 'Sélectionnez le meilleur transporteur et payez en sécurité.' },
                    { step: '4', title: 'Suivez votre envoi', desc: 'Suivez le statut en temps réel jusqu\'à la livraison.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {item.step}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/register" className="mt-6 inline-flex items-center gap-2 text-blue-600 font-medium hover:underline">
                  Publier une demande <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Carrier */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Truck className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Pour les transporteurs</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Publiez votre trajet', desc: 'Indiquez votre itinéraire, votre date et votre capacité disponible.' },
                    { step: '2', title: 'Trouvez des chargements', desc: 'Consultez les demandes compatibles avec votre trajet.' },
                    { step: '3', title: 'Acceptez et conduisez', desc: 'Confirmez la réservation et réalisez le transport.' },
                    { step: '4', title: 'Recevez votre paiement', desc: 'Paiement automatique 48h après livraison confirmée.' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                        {item.step}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/register?role=CARRIER" className="mt-6 inline-flex items-center gap-2 text-green-600 font-medium hover:underline">
                  Proposer un trajet <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Pourquoi FretoMatch ?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: 'Paiement sécurisé', desc: 'Vos fonds sont séquestrés jusqu\'à la livraison confirmée. Remboursement garanti en cas de problème.' },
                { icon: Star, title: 'Transporteurs vérifiés', desc: 'Documents, assurance et permis validés manuellement. Notation après chaque transport.' },
                { icon: MapPin, title: 'Matching intelligent', desc: 'Notre algorithme trouve les transporteurs dont le trajet passe à proximité de votre origine et destination.' },
              ].map((item) => (
                <div key={item.title} className="text-center p-6 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex justify-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-blue-600 text-white text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Prêt à commencer ?</h2>
            <p className="text-blue-200 mb-8">Inscription gratuite. Aucune commission à l&apos;inscription.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/annonces" className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5" />
                Voir les annonces
              </Link>
              <Link href="/register" className="border border-white text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-500 transition-colors">
                Créer mon compte
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
