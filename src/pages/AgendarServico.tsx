return (
  <div className="min-h-screen bg-background p-6">
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header com logo e título */}
      <Card className="bg-white shadow-lg rounded-2xl overflow-hidden animate-fadeIn">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <img src={logo} alt="Logo" className="w-24 h-24 mb-4" />
          <CardTitle className="text-2xl font-bold text-primary mb-2">
            Agende seu horário
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Escolha o serviço, profissional, data e horário que deseja
          </p>
        </CardContent>
      </Card>

      {/* Formulário de Agendamento */}
      <Card className="bg-white shadow-lg rounded-2xl overflow-hidden animate-fadeIn delay-100">
        <CardHeader className="p-6">
          <CardTitle className="text-lg font-semibold text-primary">
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Digite seu nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(99) 99999-9999"
                value={formData.telefone}
                onChange={(e) => handleInputChange("telefone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="servico">Serviço</Label>
              <Select
                value={formData.servicoId}
                onValueChange={(value) => handleInputChange("servicoId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="professional">Profissional</Label>
              <Select
                value={formData.professionalId}
                onValueChange={(value) => handleInputChange("professionalId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="data">Data</Label>
              <Select
                value={formData.data}
                onValueChange={(value) => handleInputChange("data", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a data" />
                </SelectTrigger>
                <SelectContent>
                  {diasDisponiveis.map((d) => (
                    <SelectItem key={d.data} value={d.data}>
                      {d.texto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="horario">Horário</Label>
              <Select
                value={formData.horario}
                onValueChange={(value) => handleInputChange("horario", value)}
                disabled={!availableSlots.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Deseja informar algo extra?"
              value={formData.observacoes}
              onChange={(e) => handleInputChange("observacoes", e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={saveData}
              onCheckedChange={(checked) => setSaveData(Boolean(checked))}
              id="saveData"
            />
            <Label htmlFor="saveData">Salvar meus dados para próximos agendamentos</Label>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Agendando..." : "Agendar"}
          </Button>
        </CardContent>
      </Card>

      {/* Skeleton loader mais bonito */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl shadow-inner"></div>
          ))}
        </div>
      )}
    </div>
  </div>
);
