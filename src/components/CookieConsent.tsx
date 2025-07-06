import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('cookiesAceitos');
    if (!hasAccepted) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAceitos', 'true');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Usamos cookies para melhorar sua experiência. Ao continuar, você aceita nossa 
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm underline ml-1"
                onClick={() => setShowTerms(true)}
              >
                Política de Privacidade e Termos de Uso
              </Button>
              .
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTerms(true)}>
              Acessar os Termos
            </Button>
            <Button onClick={handleAccept}>
              Aceitar e Continuar
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Termos de Uso e Política de Privacidade</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-3">🧑‍🎨 Quem Somos</h3>
              <p className="mb-4">
                A Corte & Arte é uma plataforma digital desenvolvida para transformar a rotina de profissionais da beleza e facilitar a vida dos clientes.
              </p>
              <p className="mb-4">
                Lançada oficialmente em 04 de julho de 2025, surgiu da necessidade de trazer mais organização, agilidade e profissionalismo ao agendamento de serviços no setor de beleza, estética e bem-estar.
              </p>
              <p className="mb-4">
                Com uma interface moderna, acessível e intuitiva, o sistema funciona como um aplicativo e conecta clientes aos melhores profissionais com poucos toques, de forma segura e prática.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">🌟 Nossa Missão</h3>
              <p className="mb-4">
                Oferecer uma solução tecnológica confiável e moderna para que profissionais e clientes se encontrem com conforto, pontualidade e segurança.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">🚀 O Que Oferecemos</h3>
              <ul className="list-disc list-inside space-y-1 mb-4">
                <li>Agendamento online rápido e prático</li>
                <li>Organização da agenda profissional</li>
                <li>Segurança no armazenamento de dados com Supabase</li>
                <li>Plataforma otimizada para celulares e computadores</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">📄 Termos de Uso e Responsabilidade</h3>
              <p className="text-xs text-muted-foreground mb-4">Última atualização: 04 de julho de 2025</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">1. Introdução</h4>
                  <p>Este Termo regula o uso da plataforma Corte & Arte. O uso implica aceitação total.</p>
                </div>

                <div>
                  <h4 className="font-medium">2. Finalidade da Plataforma</h4>
                  <ul className="list-disc list-inside ml-4">
                    <li>Agendamento de serviços</li>
                    <li>Organização e controle</li>
                    <li>Segurança com Supabase</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">3. Cadastro e Consentimento</h4>
                  <ul className="list-disc list-inside ml-4">
                    <li>Cadastro com dados corretos</li>
                    <li>Consentimento obrigatório</li>
                    <li>Responsabilidade sobre o uso do acesso</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">4. LGPD – Proteção de Dados</h4>
                  <ul className="list-disc list-inside ml-4">
                    <li>Respeito à Lei nº 13.709/2018</li>
                    <li>Dados essenciais apenas</li>
                    <li>Direitos: acesso, correção, exclusão, portabilidade</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">5. Marco Civil da Internet</h4>
                  <ul className="list-disc list-inside ml-4">
                    <li>Cumprimento da Lei nº 12.965/2014</li>
                    <li>Privacidade e segurança digital</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">6. Responsabilidades</h4>
                  <p><strong>Da plataforma:</strong> segurança, melhorias</p>
                  <p><strong>Do usuário:</strong> uso ético, manter dados atualizados, cumprir agendamentos</p>
                </div>

                <div>
                  <h4 className="font-medium">7. Isenção de Responsabilidade</h4>
                  <p>Corte & Arte não se responsabiliza por:</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>Atrasos ou faltas nos serviços</li>
                    <li>Informações falsas dos usuários</li>
                    <li>Qualidade ou conduta de terceiros</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">8. Retenção e Exclusão de Dados</h4>
                  <ul className="list-disc list-inside ml-4">
                    <li>Dados mantidos enquanto necessários</li>
                    <li>Exclusão de dados mediante solicitação</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">9. Atualizações</h4>
                  <p>O termo pode mudar. O uso contínuo implica aceitação das novas versões.</p>
                </div>
              </div>
            </section>

            <div className="text-center pt-6 border-t">
              <p className="font-medium">Corte & Arte — Conectando beleza, tempo e confiança.</p>
              <p className="text-muted-foreground">Em caso de dúvidas: contato@barbearia.com</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTerms(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowTerms(false);
              handleAccept();
            }}>
              Aceitar e Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;