export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-16">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="WishUp" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <p className="text-base font-bold text-gray-900">WishUp</p>
            <p className="text-xs text-gray-400">Analytics Dashboard</p>
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: abril 2026</p>

        <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Información que recopilamos</h2>
            <p>Al conectar tu cuenta de Instagram a través de WishUp Analytics Dashboard, recopilamos:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Datos de tu cuenta de Instagram Business (ID de cuenta, nombre de usuario, seguidores)</li>
              <li>Métricas de rendimiento de tu cuenta (alcance, impresiones, visitas al perfil)</li>
              <li>Información sobre tus publicaciones, reels e historias (métricas de engagement)</li>
              <li>Datos demográficos de tu audiencia (edad, género, ubicación)</li>
              <li>Token de acceso de la API de Meta para obtener tus datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Cómo usamos tu información</h2>
            <p>Usamos la información recopilada exclusivamente para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Mostrarte métricas y analíticas de tu cuenta de Instagram en el dashboard</li>
              <li>Generar reportes de rendimiento de tu contenido</li>
              <li>Actualizar automáticamente tus métricas de forma diaria</li>
            </ul>
            <p className="mt-2">No vendemos, compartimos ni cedemos tu información a terceros.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Permisos de la API de Meta</h2>
            <p>Nuestra aplicación solicita los siguientes permisos a través de la API de Meta:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>instagram_basic</strong> — Leer información básica de tu cuenta de Instagram</li>
              <li><strong>instagram_manage_insights</strong> — Acceder a las métricas de rendimiento de tu cuenta</li>
              <li><strong>pages_show_list</strong> — Ver las páginas de Facebook vinculadas a tu cuenta</li>
              <li><strong>pages_read_engagement</strong> — Leer métricas de engagement de tus páginas</li>
              <li><strong>business_management</strong> — Gestionar la conexión con tu cuenta de negocios de Meta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Almacenamiento y seguridad</h2>
            <p>Tus datos se almacenan de forma segura en servidores en la nube con cifrado en tránsito y en reposo. Los tokens de acceso se almacenan de forma segura y se utilizan únicamente para obtener tus métricas de Instagram.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Retención de datos</h2>
            <p>Conservamos tus datos mientras tu cuenta esté activa en nuestra plataforma. Puedes solicitar la eliminación de tus datos en cualquier momento escribiéndonos al correo indicado abajo.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Eliminación de datos</h2>
            <p>Para solicitar la eliminación de tus datos o revocar el acceso de nuestra aplicación a tu cuenta de Instagram, puedes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Escribirnos a <a href="mailto:antonio.vini1704@gmail.com" className="text-[#FF7200] font-medium">antonio.vini1704@gmail.com</a></li>
              <li>Revocar el acceso directamente desde <a href="https://www.facebook.com/settings?tab=business_tools" className="text-[#FF7200] font-medium" target="_blank" rel="noreferrer">Configuración de Facebook → Integraciones empresariales</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">7. Contacto</h2>
            <p>Si tienes preguntas sobre esta política de privacidad, contáctanos en:</p>
            <p className="mt-1 font-medium text-gray-800">antonio.vini1704@gmail.com</p>
          </section>

        </div>
      </div>
    </div>
  );
}
