import { Link } from "react-router-dom";
import { EMPRESA_LEGAL } from "@/config/empresaLegal";
import type { LegalSectionDef } from "@/components/legal/LegalDocument";
import {
  LegalHighlight,
  LegalLink,
  LegalList,
  LegalOrderedList,
  LegalParagraph,
  LegalSubheading,
} from "@/components/legal/LegalProse";

const L = EMPRESA_LEGAL;
const PRIVACIDADE = "/politica-de-privacidade";

export const termosDeUsoIntro = (
  <>
    <p className="mb-4">
      Estes Termos e Condições de Uso (&quot;Termos&quot;) regulam a relação comercial e o licenciamento de uso entre a
      empresa <strong>{L.razaoSocial}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {L.cnpj},
      doravante denominada &quot;<strong>LICENCIANTE</strong>&quot;, e a pessoa física ou jurídica que contrata e utiliza o
      serviço, doravante denominada &quot;<strong>CLIENTE</strong>&quot; ou &quot;<strong>LICENCIADO</strong>&quot;.
    </p>
    <p className="mb-4">
      O objeto deste instrumento é o regramento da utilização da {L.descricaoProduto}, disponibilizada sob a marca{" "}
      <strong>{L.produto}</strong>, em modelo de software como serviço (SaaS), hospedada em infraestrutura da
      LICENCIANTE ou de seus provedores contratados.
    </p>
    <LegalHighlight>
      AO CONTRATAR E UTILIZAR O {L.produto.toUpperCase()}, O CLIENTE DECLARA TER LIDO, COMPREENDIDO E ACEITO
      INTEGRALMENTE ESTES TERMOS.
    </LegalHighlight>
  </>
);

export const termosDeUsoSections: LegalSectionDef[] = [
  {
    id: "conceitos",
    title: "Conceitos importantes",
    content: (
      <>
        <LegalParagraph>Para facilitar a leitura, adotamos as seguintes definições:</LegalParagraph>
        <LegalList
          items={[
            <>
              <strong>Cliente (ou Licenciado):</strong> pessoa física ou jurídica que contrata um plano do {L.produto},
              responsável pelo pagamento, pela gestão da conta (workspace) e pelos usuários convidados.
            </>,
            <>
              <strong>{L.produto}:</strong> plataforma SaaS de propriedade da LICENCIANTE para rastreamento de leads no
              WhatsApp, campanhas com links rastreáveis, jornada comercial, métricas e integrações (Meta, Evolution e
              correlatas).
            </>,
            <>
              <strong>Conta (workspace):</strong> ambiente multiusuário vinculado a uma empresa ou operação do Cliente,
              com dados isolados dos demais clientes da plataforma.
            </>,
            <>
              <strong>Usuário:</strong> pessoa autorizada pelo Cliente a acessar o painel (administrador, membro ou
              visualizador), conforme papéis definidos na plataforma.
            </>,
            <>
              <strong>Lead:</strong> pessoa cujos dados e interações (mensagens, etapas da jornada, origens de campanha)
              são registrados pelo Cliente por meio do {L.produto}.
            </>,
            <>
              <strong>Plano de assinatura:</strong> modalidade contratada que define limites de uso (WhatsApps conectados,
              usuários, volume de leads etc.) e periodicidade de cobrança.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "natureza",
    title: "Natureza e eficácia dos Termos",
    content: (
      <>
        <LegalOrderedList
          items={[
            "Ao contratar um plano ou utilizar o " + L.produto + ", o Cliente concorda integralmente com estes Termos. A aceitação é condição indispensável para liberação e uso do serviço.",
            "A realização do pagamento, a criação da conta ou o simples uso da plataforma implica aceitação plena e inequívoca destes Termos e de suas atualizações.",
            "Estes Termos possuem força de contrato vinculante entre as partes.",
            "Pela teoria da aparência, a LICENCIANTE considerará válida a contratação realizada mediante dados cadastrais e pagamento, declarando o Cliente que o responsável pela compra possui poderes para representá-lo.",
            "A LICENCIANTE poderá alterar estes Termos a qualquer momento. O uso continuado após a publicação das alterações confirma a aceitação da nova versão.",
          ]}
        />
      </>
    ),
  },
  {
    id: "objeto",
    title: "Objeto e licença de uso",
    content: (
      <>
        <LegalSubheading>5.1. Objeto</LegalSubheading>
        <LegalParagraph>
          O contrato concede ao Cliente uma licença de uso de software (direito de uso), não exclusiva, intransferível e
          temporária, do {L.produto}, na modalidade SaaS, pelo período e limites do plano contratado.
        </LegalParagraph>
        <LegalSubheading>5.2. Escopo</LegalSubheading>
        <LegalParagraph>
          A licença permite acessar o painel web, configurar campanhas e jornada, conectar canais de WhatsApp e
          integrações habilitadas, convidar usuários dentro dos limites do plano e utilizar as funcionalidades descritas na
          documentação oficial do produto.
        </LegalParagraph>
        <LegalSubheading>5.3. Restrições</LegalSubheading>
        <LegalParagraph>Sob pena de suspensão imediata e medidas judiciais, é vedado ao Cliente:</LegalParagraph>
        <LegalList
          items={[
            "Copiar, sublicenciar, revender ou distribuir o software, seu código-fonte ou acesso administrativo da plataforma a terceiros, salvo o uso autorizado dentro da própria operação do Cliente;",
            "Realizar engenharia reversa, descompilação ou tentativa de extração do código-fonte;",
            "Utilizar a plataforma para fins ilícitos, spam, práticas abusivas em mensageria ou violação de políticas da Meta/WhatsApp;",
            "Compartilhar credenciais de acesso ou permitir uso por pessoas não cadastradas como Usuários.",
          ]}
        />
        <LegalSubheading>5.4. Natureza SaaS</LegalSubheading>
        <LegalParagraph>
          O Cliente declara ciência de que a LICENCIANTE hospeda e opera o {L.produto}, cabendo ao Cliente a correta
          configuração de campanhas, integrações e credenciais de terceiros (Meta, Evolution etc.), bem como o cumprimento
          das leis aplicáveis ao tratamento de dados de seus Leads.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "planos",
    title: "Planos, pagamento, renovação e cancelamento",
    content: (
      <>
        <LegalSubheading>6.1. Contratação e cobrança</LegalSubheading>
        <LegalParagraph>
          Os planos, preços e limites vigentes estão descritos na página comercial do {L.produto} ou na proposta aceita
          pelo Cliente. A cobrança pode ocorrer de forma recorrente (mensal, trimestral, semestral ou anual), conforme a
          modalidade escolhida no momento da contratação.
        </LegalParagraph>
        <LegalSubheading>6.2. Renovação</LegalSubheading>
        <LegalParagraph>
          Salvo cancelamento prévio nos canais indicados pela LICENCIANTE, planos recorrentes renovam-se automaticamente
          no ciclo contratado, com cobrança no meio de pagamento cadastrado.
        </LegalParagraph>
        <LegalSubheading>6.3. Cancelamento e arrependimento</LegalSubheading>
        <LegalOrderedList
          items={[
            "Em conformidade com o art. 49 do Código de Defesa do Consumidor, o Cliente pessoa física ou microempresa enquadrada como consumidor poderá solicitar cancelamento com reembolso integral em até 7 (sete) dias corridos da primeira contratação, desde que não tenha utilizado de forma substancial os serviços — critérios avaliados caso a caso pela LICENCIANTE.",
            "Após o prazo de arrependimento, o cancelamento interrompe renovações futuras, permanecendo o acesso até o fim do período já pago, salvo inadimplência ou violação destes Termos.",
            "Não há reembolso proporcional (pro rata) por período não utilizado após o prazo legal de arrependimento, salvo disposição expressa em contrato específico.",
          ]}
        />
        <LegalSubheading>6.4. Inadimplência e suspensão</LegalSubheading>
        <LegalParagraph>
          Em caso de falha de pagamento, chargeback indevido ou violação grave destes Termos, a LICENCIANTE poderá
          suspender o acesso à conta, links públicos e integrações até a regularização, sem prejuízo da cobrança de valores
          devidos.
        </LegalParagraph>
        <LegalSubheading>6.5. Custos de terceiros</LegalSubheading>
        <LegalParagraph>
          Valores cobrados pela LICENCIANTE referem-se à licença do {L.produto}. Custos de APIs, anúncios, mensageria,
          provedores de WhatsApp, tokens de IA ou serviços externos são de responsabilidade exclusiva do Cliente.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "suporte",
    title: "Suporte técnico",
    content: (
      <>
        <LegalParagraph>
          O suporte é prestado pelos canais oficiais informados no painel ou por e-mail em{" "}
          <a href={`mailto:${L.emailSuporte}`} className="font-medium text-primary hover:underline">
            {L.emailSuporte}
          </a>
          , em dias úteis, em horário comercial (Brasília), exceto feriados nacionais.
        </LegalParagraph>
        <LegalSubheading>Incluído no suporte</LegalSubheading>
        <LegalList
          items={[
            "Dúvidas sobre funcionamento e recursos nativos do " + L.produto + ";",
            "Investigação de falhas ou bugs atribuíveis à plataforma;",
            "Orientação sobre configurações disponíveis no painel do produto.",
          ]}
        />
        <LegalSubheading>Fora do escopo padrão</LegalSubheading>
        <LegalList
          items={[
            "Consultoria de marketing, criação de campanhas ou definição de estratégia comercial;",
            "Configuração de contas Meta, Business Manager ou políticas de anúncios;",
            "Problemas exclusivos de APIs não oficiais de WhatsApp ou de instabilidade de terceiros;",
            "Customizações de código ou design fora das opções nativas do produto.",
          ]}
        />
      </>
    ),
  },
  {
    id: "obrigacoes",
    title: "Obrigações, responsabilidades e limitações",
    content: (
      <>
        <LegalSubheading>Obrigações da LICENCIANTE</LegalSubheading>
        <LegalParagraph>
          Disponibilizar o {L.produto} conforme o plano contratado, manter medidas razoáveis de segurança na infraestrutura
          sob seu controle, aplicar atualizações de correção e prestar suporte nos limites destes Termos.
        </LegalParagraph>
        <LegalSubheading>Obrigações do Cliente</LegalSubheading>
        <LegalParagraph>
          Fornecer dados verdadeiros, gerenciar Usuários e permissões, obter bases legais adequadas para tratar dados de
          Leads, respeitar políticas da Meta/WhatsApp e não utilizar a plataforma para práticas proibidas ou abusivas.
        </LegalParagraph>
        <LegalSubheading>Integrações e terceiros</LegalSubheading>
        <LegalParagraph>
          A LICENCIANTE não controla serviços de terceiros (Meta, Evolution, gateways). Indisponibilidade, bloqueios de
          números, mudanças de API ou políticas de plataformas externas não isentam o Cliente do pagamento nem geram
          direito automático a reembolso. O Cliente declara ciência dos termos do WhatsApp Business:{" "}
          <LegalLink href="https://www.whatsapp.com/legal/business-terms/">termos da plataforma</LegalLink>.
        </LegalParagraph>
        <LegalSubheading>Limitação de responsabilidade</LegalSubheading>
        <LegalParagraph>
          Na extensão permitida pela lei, a responsabilidade da LICENCIANTE limita-se ao valor pago pelo Cliente nos 12
          (doze) meses anteriores ao evento. Não respondemos por lucros cessantes, danos indiretos ou perdas decorrentes de
          fatores externos à plataforma (internet, terceiros, configuração incorreta pelo Cliente).
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    content: (
      <>
        <LegalParagraph>
          O {L.produto}, seu código, marca, documentação e interfaces são de propriedade exclusiva da LICENCIANTE. A
          contratação não transfere direitos autorais — apenas licença de uso limitada.
        </LegalParagraph>
        <LegalParagraph>
          Dados, listas de Leads, conteúdos de mensagens e estratégias comerciais inseridos pelo Cliente permanecem de
          titularidade do Cliente, que concede à LICENCIANTE licença estritamente necessária para hospedar, processar e
          exibir tais dados na prestação do serviço.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "privacidade",
    title: "Privacidade e proteção de dados (LGPD)",
    content: (
      <>
        <LegalParagraph>
          O tratamento de dados pessoais é regido pelo{" "}
          <Link to={PRIVACIDADE} className="font-medium text-primary hover:underline">
            Aviso de Privacidade
          </Link>
          , parte integrante destes Termos. Em síntese: a LICENCIANTE é controladora dos dados cadastrais do Cliente e
          atua como operadora (ou co-controladora, conforme o caso) dos dados de Leads tratados em nome do Cliente na
          plataforma SaaS.
        </LegalParagraph>
        <LegalParagraph>
          O Cliente é responsável por informar seus Leads, obter consentimentos quando necessários e atender solicitações
          de titulares relativas aos dados que controla.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "disposicoes",
    title: "Disposições gerais",
    content: (
      <>
        <LegalOrderedList
          items={[
            "Comunicações válidas serão enviadas aos e-mails cadastrados ou por avisos no painel.",
            "A tolerância quanto a descumprimentos não implica renúncia de direitos.",
            "A LICENCIANTE poderá rescindir ou suspender o serviço em caso de conduta abusiva contra sua equipe ou violação grave destes Termos.",
            "O Cliente não pode ceder este contrato sem autorização prévia por escrito. A LICENCIANTE poderá ceder em caso de reorganização societária.",
            "Se alguma cláusula for inválida, as demais permanecem em vigor.",
          ]}
        />
      </>
    ),
  },
  {
    id: "foro",
    title: "Foro e legislação aplicável",
    content: (
      <>
        <LegalParagraph>
          Este contrato rege-se pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da
          LICENCIANTE, com renúncia a qualquer outro, por mais privilegiado que seja, salvo hipóteses de competência
          absoluta previstas em lei consumerista.
        </LegalParagraph>
        <LegalParagraph>
          Dúvidas contratuais e financeiras:{" "}
          <a href={`mailto:${L.emailFinanceiro}`} className="font-medium text-primary hover:underline">
            {L.emailFinanceiro}
          </a>
          . Consulta cadastral da empresa:{" "}
          <LegalLink href={L.cnpjConsultaUrl}>CNPJ {L.cnpj}</LegalLink>.
        </LegalParagraph>
      </>
    ),
  },
];
