# Emails Personalizados - Corte & Arte

Este sistema intercepta e personaliza todos os emails de autenticação do Supabase, enviando-os com a identidade visual do Corte & Arte e em português.

## Configuração Necessária

### 1. Resend API Key
1. Acesse [resend.com](https://resend.com)
2. Crie uma conta e configure um domínio
3. Gere uma API key
4. Configure a secret `RESEND_API_KEY` no Supabase

### 2. Webhook do Supabase
1. No dashboard do Supabase, vá em Authentication > Settings > Auth Hooks
2. Configure um webhook para: `https://gwyickztdeiplccievyt.supabase.co/functions/v1/custom-auth-emails`
3. Gere um segredo para o webhook
4. Configure a secret `SUPABASE_AUTH_WEBHOOK_SECRET` no Supabase

### 3. Domínio de Email (Opcional)
Para melhor entregabilidade, configure um domínio personalizado:
- No Resend, configure seu domínio (ex: corte-e-arte.com)
- Atualize o campo 'from' na edge function para usar seu domínio

## Templates Inclusos

### ✅ Email de Confirmação de Cadastro
- Assunto: "Confirme seu e-mail - Corte & Arte"
- Usado para: signup, email_change, invite

### ✅ Email de Recuperação de Senha
- Assunto: "Redefinir senha - Corte & Arte"
- Usado para: recovery

## Características

- ✂️ **Identidade Visual**: Logo e cores do Corte & Arte
- 🇧🇷 **Português**: Textos traduzidos e profissionais
- 📱 **Responsivo**: Templates funcionam em desktop e mobile
- 🔒 **Seguro**: Verificação de webhook signature
- 🎨 **Profissional**: Design limpo e moderno

## Testando

1. Faça um novo cadastro ou solicite recuperação de senha
2. Verifique se o email chegou com o remetente "Corte & Arte"
3. Confirme que o conteúdo está em português
4. Teste os links de confirmação

## Logs

Para monitorar o funcionamento:
- Acesse o Supabase Dashboard > Edge Functions > custom-auth-emails > Logs
- Verifique se há erros na entrega dos emails