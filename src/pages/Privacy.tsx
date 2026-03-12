import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Privacy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <h1 className="font-serif font-bold text-lg">Gizlilik Politikası</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold font-serif text-primary">1. Veri Toplama ve Kullanımı</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Kitap okuma alışkanlıklarınızı geliştirmek ve size daha iyi bir deneyim sunmak amacıyla
                        okuduğunuz kitaplar, okuma hızınız ve okuma listeleriniz gibi veriler toplanmaktadır.
                        Bu veriler sadece uygulama içi deneyiminizi kişiselleştirmek için kullanılır.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold font-serif text-primary">2. Bilgi Paylaşımı</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Kişisel bilgileriniz (e-posta adresiniz, şifreniz vb.) hiçbir koşulda üçüncü şahıslarla
                        veya kurumlarla paylaşılmaz. Girdiğiniz kulüp (Grup) koduna bağlı olarak, sadece aynı kulüpteki diğer üyeler
                        okuma istatistiklerinizi ve herkese açık yorumlarınızı görebilir.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold font-serif text-primary">3. Veri Güvenliği</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Kullanıcı bilgileriniz uluslararası standartlarda şifrelenmiş sunucularda güvenli bir şekilde
                        saklanmaktadır. Her kullanıcının verisi diğer kullanıcılardan izole edilmiştir.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold font-serif text-primary">4. Hesap Silme</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Dilediğiniz zaman hesabınızı ve tüm verilerinizi kalıcı olarak silebilirsiniz.
                        Silinen veriler sistemlerimizden tamamen kaldırılır ve geri getirilemez.
                    </p>
                </section>

                <section className="bg-muted/50 rounded-xl p-6 mt-8 border-2 border-border text-center">
                    <Shield className="w-10 h-10 text-primary mx-auto mb-3 opacity-80" />
                    <p className="text-sm font-medium">Verileriniz bizim için önemli ve güvendedir.</p>
                    <p className="text-xs text-muted-foreground mt-1">Son Güncelleme: Mart 2026</p>
                </section>
            </div>
        </div>
    );
};

export default Privacy;
