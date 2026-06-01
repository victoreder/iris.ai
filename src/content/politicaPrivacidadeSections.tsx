import { Link } from "react-router-dom";
import { EMPRESA_LEGAL } from "@/config/empresaLegal";
import type { LegalSectionDef } from "@/components/legal/LegalDocument";
import {
  LegalHighlight,
  LegalLink,
  LegalList,
  LegalParagraph,
  LegalSubheading,
  LegalTable,
} from "@/components/legal/LegalProse";

const L = EMPRESA_LEGAL;
const TERMOS = "/termos-de-uso";

export const politicaPrivacidadeIntro = (
  <>
    <p className="mb-4">
      A <strong>{L.razaoSocial}</strong>, inscrita no CNPJ sob o nº {L.cnpj} (&quot;LICENCIANTE&quot; ou
      &quot;nós&quot;), criou este Aviso de Privacidade para explicar como tratamos dados pessoais quando você contrata,
      acessa ou utiliza o <strong>{L.produto}</strong>, ou quando visita nossos sites e páginas institucionais.
    </p>
    <p className="mb-4">
      O {L.produto} é uma plataforma SaaS de {L.descricaoProduto}. Os dados operacionais (leads, mensagens, métricas) são
      processados em infraestrutura contratada pela LICENCIANTE, em ambiente multi-tenant com isolamento lógico por conta do
      Cliente.
    </p>
    <LegalHighlight>
      Este Aviso integra os{" "}
      <Link to={TERMOS} className="text-primary hover:underline">
        Termos e Condições de Uso
      </Link>
      . Para exercer seus direitos como titular ou esclarecer dúvidas, utilize os canais no final do documento.
    </LegalHighlight>
  </>
);

export const politicaPrivacidadeSections: LegalSectionDef[] = [
  {
    id: "definicoes",
    title: "Definições",
    content: (
      <LegalList
        items={[
          <>
            <strong>Cliente:</strong> pessoa física ou jurídica que contrata o {L.produto} e administra uma ou mais contas
            (workspaces).
          </>,
          <>
            <strong>Usuário:</strong> pessoa indicada pelo Cliente para operar o painel.
          </>,
          <>
            <strong>Titular:</strong> pessoa natural a quem se referem os dados pessoais.
          </>,
          <>
            <strong>Lead:</strong> pessoa cujos dados o Cliente registra na plataforma (contatos, conversas, origens de
            campanha etc.).
          </>,
          <>
            <strong>Controlador / Operador:</strong> conceitos da Lei nº 13.709/2018 (LGPD).
          </>,
          <>
            <strong>Site:</strong> domínios operados pela LICENCIANTE no contexto do {L.produto}, incluindo{" "}
            <LegalLink href={L.siteApp}>{L.siteApp}</LegalLink> e{" "}
            <LegalLink href={L.siteLp}>{L.siteLp}</LegalLink>.
          </>,
        ]}
      />
    ),
  },
  {
    id: "aplicacao",
    title: "A quem se aplica este Aviso",
    content: (
      <>
        <LegalParagraph>Este Aviso aplica-se a:</LegalParagraph>
        <LegalList
          items={[
            "Visitantes do Site e leads que preenchem formulários de contato;",
            "Clientes que contratam planos do " + L.produto + ";",
            "Usuários convidados pelos Clientes para operar o software.",
          ]}
        />
        <LegalParagraph>
          Não se aplica, em regra, aos Leads atendidos pelo Cliente — em relação a esses dados, o Cliente é o Controlador
          e deve manter política própria e canais para atender titulares. A LICENCIANTE trata esses dados como Operadora,
          nos limites das instruções do Cliente e da prestação do serviço.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "coleta",
    title: "Quais dados coletamos e como",
    content: (
      <>
        <LegalSubheading>3.1. Dados fornecidos diretamente</LegalSubheading>
        <LegalList
          items={[
            "Identificação e contato: nome, e-mail, telefone, CPF ou CNPJ;",
            "Credenciais: senha (armazenada em hash) e registros de aceite dos Termos e deste Aviso;",
            "Dados da conta: nome da empresa, configurações de campanha, jornada e integrações;",
            "Mensagens enviadas ao suporte ou canais de contato.",
          ]}
        />
        <LegalSubheading>3.2. Dados coletados automaticamente</LegalSubheading>
        <LegalList
          items={[
            "Logs de acesso: IP, data e hora, dispositivo e navegador (Marco Civil da Internet);",
            "Cookies e tecnologias similares no Site (ver capítulo Cookies).",
          ]}
        />
        <LegalSubheading>3.3. Dados operacionais na plataforma</LegalSubheading>
        <LegalParagraph>
          Para prestar o {L.produto}, processamos em nome do Cliente dados de Leads, como número de telefone, nome,
          histórico de mensagens trocadas via integrações de WhatsApp, etapas da jornada, parâmetros UTM de campanhas e
          eventos enviados à Meta (quando configurado). O Cliente define quais integrações ativar e quais dados trafegar.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Finalidades do tratamento",
    content: (
      <LegalList
        items={[
          "Operação do contrato: identificar Cliente e Usuário, faturar, provisionar conta, prestar suporte e comunicar alterações contratuais;",
          "Prestação do serviço: rastrear cliques em links, registrar conversas e jornada, enviar eventos de conversão à Meta quando habilitado;",
          "Segurança e prevenção a fraudes: monitorar abusos, proteger infraestrutura e cumprir obrigações legais;",
          "Comunicação institucional: responder contatos e, com opt-out, enviar novidades sobre o " + L.produto + ";",
          "Melhoria do produto: análise agregada de uso e desempenho, respeitados consentimentos de cookies quando aplicável.",
        ]}
      />
    ),
  },
  {
    id: "bases",
    title: "Bases legais aplicáveis",
    content: (
      <LegalTable
        headers={["Dados", "Finalidade", "Base legal (LGPD)"]}
        rows={[
          [
            "Cadastro de Cliente e Usuário",
            "Contrato e acesso ao " + L.produto,
            "Execução de contrato (art. 7º, V)",
          ],
          [
            "Dados de Leads na plataforma",
            "Prestação do serviço ao Cliente",
            "Execução de contrato (art. 7º, V) — Cliente como Controlador",
          ],
          ["Logs e segurança", "Registro e proteção", "Obrigação legal e legítimo interesse (arts. 7º, II e IX)"],
          ["Marketing e cookies opcionais", "Mensuração e comunicação", "Consentimento (art. 7º, I), com opt-out"],
        ]}
      />
    ),
  },
  {
    id: "compartilhamento",
    title: "Com quem compartilhamos seus dados",
    content: (
      <>
        <LegalParagraph>
          Compartilhamos dados apenas com terceiros indispensáveis à operação, sob contratos ou padrões compatíveis com a
          LGPD:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <strong>Infraestrutura e banco de dados</strong> (hospedagem, armazenamento e autenticação), incluindo
              provedores de nuvem utilizados na stack do {L.produto};
            </>,
            <>
              <strong>Processadores de pagamento</strong>, quando a contratação ocorre por gateways ou marketplaces
              parceiros — regidos pelas políticas desses provedores;
            </>,
            <>
              <strong>Meta / WhatsApp</strong>, quando o Cliente habilita integrações oficiais ou envio de eventos via
              Conversions API;
            </>,
            <>
              <strong>Provedores de WhatsApp</strong> (ex.: Evolution API), conforme configuração do Cliente;
            </>,
            <>
              <strong>Ferramentas de e-mail e suporte</strong> para comunicação transacional e atendimento.
            </>,
          ]}
        />
        <LegalParagraph>
          A lista nominal atualizada de operadores pode ser solicitada pelo titular (art. 18, VII, LGPD) em{" "}
          <a href={`mailto:${L.emailPrivacidade}`} className="font-medium text-primary hover:underline">
            {L.emailPrivacidade}
          </a>
          .
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "saas",
    title: "Particularidades do modelo SaaS",
    content: (
      <>
        <LegalSubheading>Divisão de papéis</LegalSubheading>
        <LegalList
          items={[
            "LICENCIANTE como Controladora: dados cadastrais do Cliente e do Usuário, faturamento, logs de acesso ao Site e comunicações conosco.",
            "Cliente como Controlador: dados pessoais dos Leads e demais terceiros cujo tratamento o Cliente determina na plataforma.",
            "LICENCIANTE como Operadora: tratamento de dados de Leads limitado ao necessário para executar funcionalidades contratadas, conforme instruções do Cliente e destes Termos.",
          ]}
        />
        <LegalSubheading>Armazenamento</LegalSubheading>
        <LegalParagraph>
          Os dados operacionais ficam em ambiente hospedado pela LICENCIANTE (ou suboperadores), com segregação por conta.
          O Cliente pode exportar ou solicitar exclusão conforme funcionalidades do produto e obrigações legais.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "retencao",
    title: "Por quanto tempo guardamos seus dados",
    content: (
      <>
        <LegalList
          items={[
            "Enquanto a conta estiver ativa: dados cadastrais e operacionais necessários ao serviço;",
            "Após encerramento: até 5 (cinco) anos para defesa em processos, salvo prazos legais maiores (fiscal etc.);",
            "Logs de aplicação: mínimo de 6 (seis) meses (Marco Civil).",
          ]}
        />
        <LegalParagraph>
          Solicitações de exclusão:{" "}
          <a href={`mailto:${L.emailPrivacidade}`} className="font-medium text-primary hover:underline">
            {L.emailPrivacidade}
          </a>
          . Dados de Leads controlados pelo Cliente devem ser solicitados diretamente ao Cliente.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Como protegemos seus dados",
    content: (
      <>
        <LegalParagraph>
          Adotamos medidas técnicas e organizacionais, como controle de acesso, criptografia em trânsito (TLS), políticas
          de senha, isolamento multi-tenant e contratos com suboperadores.
        </LegalParagraph>
        <LegalParagraph>
          Nenhuma transmissão pela internet é totalmente segura. Suspeitas de incidente envolvendo nossos sistemas devem
          ser reportadas imediatamente a{" "}
          <a href={`mailto:${L.emailPrivacidade}`} className="font-medium text-primary hover:underline">
            {L.emailPrivacidade}
          </a>
          .
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "direitos",
    title: "Direitos do Titular",
    content: (
      <>
        <LegalParagraph>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade,
          eliminação, informação sobre compartilhamentos, revogação de consentimento e oposição a tratamentos baseados em
          legítimo interesse, pelo e-mail{" "}
          <a href={`mailto:${L.emailPrivacidade}`} className="font-medium text-primary hover:underline">
            {L.emailPrivacidade}
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          Podemos solicitar comprovação de identidade. Prazos seguem a legislação aplicável. Reclamações podem ser
          dirigidas à ANPD.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <>
        <LegalParagraph>O Site pode utilizar:</LegalParagraph>
        <LegalList
          items={[
            "Cookies estritamente necessários: funcionamento e segurança, sem necessidade de consentimento;",
            "Cookies opcionais (estatísticos ou de marketing): somente com consentimento, quando o banner estiver ativo.",
          ]}
        />
        <LegalParagraph>
          Você pode gerenciar preferências no navegador ou no banner de cookies, quando disponível.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "internacional",
    title: "Transferência internacional de dados",
    content: (
      <LegalParagraph>
        Provedores de infraestrutura, CDN, e-mail ou integrações podem processar dados fora do Brasil. Nesses casos,
        adotamos cláusulas contratuais ou salvaguardas previstas no art. 33 da LGPD. Integrações configuradas pelo
        Cliente (Meta, EUA etc.) seguem políticas dos respectivos controladores.
      </LegalParagraph>
    ),
  },
  {
    id: "contato",
    title: "Encarregado e canais de contato",
    content: (
      <>
        <LegalParagraph>Em cumprimento ao art. 41 da LGPD:</LegalParagraph>
        <LegalList
          items={[
            <>
              Privacidade e exercício de direitos:{" "}
              <a href={`mailto:${L.emailPrivacidade}`} className="font-medium text-primary hover:underline">
                {L.emailPrivacidade}
              </a>
            </>,
            <>
              Assuntos financeiros e contratuais:{" "}
              <a href={`mailto:${L.emailFinanceiro}`} className="font-medium text-primary hover:underline">
                {L.emailFinanceiro}
              </a>
            </>,
          ]}
        />
        <LegalParagraph>
          {L.razaoSocial} — CNPJ {L.cnpj}.{" "}
          <LegalLink href={L.cnpjConsultaUrl}>Consultar dados cadastrais</LegalLink>.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações desta Política",
    content: (
      <LegalParagraph>
        Podemos atualizar este Aviso a qualquer tempo. Alterações relevantes serão comunicadas por e-mail ou aviso no Site.
        A versão vigente está em{" "}
        <LegalLink href={`${L.siteApp}/politica-de-privacidade`}>
          {L.siteApp}/politica-de-privacidade
        </LegalLink>
        . O uso continuado do {L.produto} após a publicação indica ciência da nova versão.
      </LegalParagraph>
    ),
  },
];
