import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const serviceCategories = [
  {
    title: "Serviços Masculinos",
    services: [
      { name: "Corte Social", price: 30, duration: "25 min" },
      { name: "Corte Degradê", price: 35, duration: "30 min" },
      { name: "Barba Simples", price: 20, duration: "15 min" },
      { name: "Barba Completa", price: 25, duration: "20 min" },
      { name: "Combo Corte + Barba", price: 55, duration: "45 min" },
    ]
  },
  {
    title: "Serviços Femininos",
    services: [
      { name: "Corte Feminino", price: 65, duration: "45 min" },
      { name: "Escova", price: 45, duration: "30 min" },
      { name: "Hidratação", price: 80, duration: "60 min" },
      { name: "Corte + Escova", price: 95, duration: "75 min" },
      { name: "Progressiva", price: 180, duration: "120 min" },
    ]
  },
  {
    title: "Serviços Premium",
    services: [
      { name: "Day Spa Capilar", price: 150, duration: "90 min" },
      { name: "Tratamento Anti-idade", price: 120, duration: "60 min" },
      { name: "Coloração Completa", price: 200, duration: "120 min" },
      { name: "Luzes/Mechas", price: 160, duration: "90 min" },
    ]
  }
];

export const ServicesSection = () => {
  return (
    <section id="servicos" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Nossos Serviços</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Oferecemos uma ampla gama de serviços profissionais para cuidar da sua beleza 
            e bem-estar com todo o carinho e atenção que você merece.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {serviceCategories.map((category, index) => (
            <Card key={index} className="shadow-card hover:shadow-elegant transition-shadow">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{category.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.services.map((service, serviceIndex) => (
                  <div
                    key={serviceIndex}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {service.duration}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      R$ {service.price}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            * Preços podem variar conforme a complexidade do serviço
          </p>
        </div>
      </div>
    </section>
  );
};