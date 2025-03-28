const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const { Sequelize, Op } = require('sequelize');
const db = require('../models');
const { Campaign, MetaAccount } = db;
const logger = require('../utils/logger');

// Caminho onde os relatórios serão armazenados
const REPORTS_DIR = path.join(__dirname, '../../reports');

// Garantir que o diretório de relatórios exista
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Mapeamento de relatórios compartilhados (temporário - em produção usar banco de dados)
const sharedReports = new Map();

/**
 * Gera um relatório PDF para uma campanha específica
 */
exports.generateCampaignReport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    // Validar parâmetros
    if (!campaignId) {
      return res.status(400).json({ error: 'ID da campanha é obrigatório' });
    }

    // Buscar dados da campanha
    const campaign = await Campaign.findByPk(campaignId, {
      include: [{
        model: MetaAccount,
        as: 'metaAccount'
      }]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Nome do arquivo baseado no ID da campanha
    const fileName = `campaign_${campaignId}_${Date.now()}.pdf`;
    const pdfPath = path.join(REPORTS_DIR, fileName);

    // Usar dados já presentes no objeto campaign
    // Criar objeto de estatísticas usando os dados da campanha
    const statistics = [{
      date: new Date(),
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      spend: parseFloat(campaign.spend) || 0,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.clicks > 0 ? parseFloat(campaign.spend) / campaign.clicks : 0
    }];

    // Gerar o PDF com as estatísticas disponíveis
    await generatePDF(pdfPath, campaign, statistics, { startDate, endDate });

    // Construir URLs para relatório
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `/reports/${fileName}`;
    const fullDownloadUrl = `${serverUrl}${downloadUrl}`;

    return res.status(200).json({
      reportId: fileName,
      downloadUrl: downloadUrl,
      fullDownloadUrl: fullDownloadUrl,
      message: 'Relatório gerado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
};

/**
 * Gera um relatório PDF com todas as campanhas
 */
exports.generateAllCampaignsReport = async (req, res) => {
  try {
    const { startDate, endDate, metaAccountId } = req.query;

    // Configurar condições para a consulta
    const whereConditions = {};

    // Filtrar por conta meta se informado
    if (metaAccountId && metaAccountId !== 'all') {
      const account = await MetaAccount.findByPk(metaAccountId);
      if (account) {
        whereConditions.adAccountId = account.accountId;
      }
    }

    // Buscar campanhas
    const campaigns = await Campaign.findAll({
      where: whereConditions,
      include: [{
        model: MetaAccount,
        as: 'metaAccount',
        attributes: ['id', 'name', 'accountId']
      }],
      order: [['name', 'ASC']]
    });

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Nenhuma campanha encontrada' });
    }

    // Criar nome de arquivo único
    const timestamp = Date.now();
    const reportFileName = `all_campaigns_${timestamp}.pdf`;
    const filePath = path.join(REPORTS_DIR, reportFileName);

    // Configurar documento PDF
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Gerar conteúdo do PDF
    doc.fontSize(20).text('Relatório de Todas as Campanhas', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown();

    // Adicionar dados de cada campanha
    campaigns.forEach((campaign, index) => {
      const metaAccountName = campaign.metaAccount ? campaign.metaAccount.name : 'Não associada';

      doc.fontSize(14).text(`Campanha: ${campaign.name}`);
      doc.fontSize(10).text(`Conta Meta: ${metaAccountName}`);
      doc.text(`Status: ${campaign.status}`);
      doc.text(`Objetivo: ${campaign.objective || 'Não definido'}`);
      doc.text(`Data de início: ${campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('pt-BR') : 'Não definida'}`);
      doc.text(`Data de término: ${campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('pt-BR') : 'Em andamento'}`);
      doc.text(`Orçamento diário: ${typeof campaign.dailyBudget === 'number' ? `R$ ${campaign.dailyBudget.toFixed(2)}` : 'Não definido'}`);
      doc.text(`Orçamento vitalício: ${typeof campaign.lifetimeBudget === 'number' ? `R$ ${campaign.lifetimeBudget.toFixed(2)}` : 'Não definido'}`);
      doc.text(`Impressões: ${campaign.impressions || 0}`);
      doc.text(`Cliques: ${campaign.clicks || 0}`);
      doc.text(`Conversões: ${campaign.conversions || 0}`);
      doc.text(`Gasto: ${typeof campaign.spend === 'number' ? `R$ ${campaign.spend.toFixed(2)}` : 'R$ 0,00'}`);

      // Adicionar linha divisória entre campanhas (exceto na última)
      if (index < campaigns.length - 1) {
        doc.moveDown();
        doc.moveTo(50, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .stroke();
        doc.moveDown();
      }
    });

    // Finalizar documento
    doc.end();

    // Aguardar a finalização da escrita do arquivo
    await new Promise((resolve) => {
      writeStream.on('finish', resolve);
    });

    // Construir URLs para relatório
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `/reports/${reportFileName}`;
    const fullDownloadUrl = `${serverUrl}${downloadUrl}`;

    // Retornar informações sobre o relatório gerado
    return res.status(200).json({
      success: true,
      reportId: reportFileName,
      downloadUrl: downloadUrl,
      fullDownloadUrl: fullDownloadUrl,
      message: 'Relatório gerado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao gerar relatório de todas as campanhas:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
};

/**
 * Faz download de um relatório gerado
 */
exports.downloadReport = (req, res) => {
  try {
    const { reportId } = req.params;
    // Usar path.resolve para obter o caminho absoluto do arquivo
    const pdfPath = path.resolve(REPORTS_DIR, reportId);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Configurar cabeçalhos corretos para download do arquivo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${reportId}`);

    // Enviar o arquivo como resposta usando caminho absoluto
    return res.sendFile(pdfPath);
  } catch (error) {
    logger.error('Erro ao fazer download do relatório:', error);
    return res.status(500).json({ error: 'Erro ao fazer download do relatório' });
  }
};

/**
 * Cria um link de compartilhamento para o relatório
 */
exports.createShareLink = (req, res) => {
  try {
    const { reportId } = req.params;
    // Usar path.resolve para obter o caminho absoluto do arquivo
    const pdfPath = path.resolve(REPORTS_DIR, reportId);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Criar um token único para compartilhamento
    const shareToken = uuidv4();

    // Salvar informações do relatório compartilhado (em produção, usar banco de dados)
    // Configurar expiração para 7 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    sharedReports.set(shareToken, {
      reportId,
      expiresAt
    });

    // Construir URL completa com protocolo e host
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `/reports/shared/${shareToken}`;
    const fullShareUrl = `${serverUrl}${shareUrl}`;

    return res.status(200).json({
      shareToken,
      shareUrl,
      fullShareUrl,
      expiresAt
    });
  } catch (error) {
    logger.error('Erro ao criar link de compartilhamento:', error);
    return res.status(500).json({ error: 'Erro ao criar link de compartilhamento' });
  }
};

/**
 * Acessa um relatório compartilhado
 */
exports.getSharedReport = (req, res) => {
  try {
    const { shareToken } = req.params;

    // Verificar se o token existe
    if (!sharedReports.has(shareToken)) {
      return res.status(404).json({ error: 'Link de compartilhamento inválido ou expirado' });
    }

    // Verificar se o link expirou
    const shared = sharedReports.get(shareToken);
    if (new Date() > new Date(shared.expiresAt)) {
      sharedReports.delete(shareToken); // Limpar token expirado
      return res.status(404).json({ error: 'Link de compartilhamento expirado' });
    }

    // Carregar o PDF
    const { reportId } = shared;
    // Usar path.resolve para obter o caminho absoluto do arquivo
    const pdfPath = path.resolve(REPORTS_DIR, reportId);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Servir o PDF diretamente
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${reportId}`);

    // Enviar o arquivo como resposta usando caminho absoluto
    return res.sendFile(pdfPath);
  } catch (error) {
    logger.error('Erro ao acessar relatório compartilhado:', error);
    return res.status(500).json({ error: 'Erro ao acessar relatório compartilhado' });
  }
};

/**
 * Funções auxiliares para geração de PDF
 */

// Função para gerar PDF de campanha única
async function generatePDF(filePath, campaign, statistics, options) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      // Eventos de stream
      stream.on('error', reject);
      stream.on('finish', resolve);

      doc.pipe(stream);

      // Título do relatório
      doc.fontSize(25).text('Relatório de Campanha', { align: 'center' });
      doc.moveDown();

      // Informações da conta
      doc.fontSize(14).text('Conta Meta:', { continued: true })
        .fontSize(12).text(` ${campaign.metaAccount ? campaign.metaAccount.name : 'N/A'}`);

      // Informações da campanha
      doc.fontSize(14).text('Campanha:', { continued: true })
        .fontSize(12).text(` ${campaign.name}`);

      doc.fontSize(14).text('ID da Campanha:', { continued: true })
        .fontSize(12).text(` ${campaign.campaignId}`);

      doc.fontSize(14).text('Status:', { continued: true })
        .fontSize(12).text(` ${campaign.status}`);

      // Período do relatório
      if (options.startDate && options.endDate) {
        doc.fontSize(14).text('Período:', { continued: true })
          .fontSize(12).text(` ${options.startDate} a ${options.endDate}`);
      }

      doc.moveDown(2);

      // Dados de desempenho
      if (statistics && statistics.length > 0) {
        // Totais
        const totals = statistics.reduce((acc, stat) => {
          acc.impressions += stat.impressions || 0;
          acc.clicks += stat.clicks || 0;
          acc.spend += stat.spend || 0;
          return acc;
        }, { impressions: 0, clicks: 0, spend: 0 });

        // Métricas calculadas
        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
        const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

        // Resumo
        doc.fontSize(16).text('Resumo de Desempenho', { underline: true });
        doc.moveDown();

        doc.fontSize(12).text(`Impressões: ${totals.impressions.toLocaleString()}`);
        doc.fontSize(12).text(`Cliques: ${totals.clicks.toLocaleString()}`);
        doc.fontSize(12).text(`Gastos: R$ ${totals.spend.toFixed(2)}`);
        doc.fontSize(12).text(`CTR: ${ctr.toFixed(2)}%`);
        doc.fontSize(12).text(`CPC: R$ ${cpc.toFixed(2)}`);
        doc.fontSize(12).text(`CPM: R$ ${cpm.toFixed(2)}`);

        doc.moveDown(2);

        // Tabela de dados diários
        doc.fontSize(16).text('Dados Diários', { underline: true });
        doc.moveDown();

        // Cabeçalho da tabela
        const tableTop = doc.y;
        const tableHeaders = ['Data', 'Impressões', 'Cliques', 'Gastos (R$)', 'CTR (%)', 'CPC (R$)'];
        const columnWidth = 80;

        let yPosition = tableTop;

        // Desenhar cabeçalho
        doc.fontSize(10);
        tableHeaders.forEach((header, i) => {
          doc.text(header, 50 + (i * columnWidth), yPosition, { width: columnWidth, align: 'left' });
        });

        yPosition += 20;

        // Adicionar dados
        statistics.forEach(stat => {
          // Verificar se precisamos de uma nova página
          if (yPosition > doc.page.height - 100) {
            doc.addPage();
            yPosition = 50;

            // Redesenhar cabeçalho na nova página
            tableHeaders.forEach((header, i) => {
              doc.text(header, 50 + (i * columnWidth), yPosition, { width: columnWidth, align: 'left' });
            });

            yPosition += 20;
          }

          const date = new Date(stat.date).toLocaleDateString('pt-BR');
          const impressions = stat.impressions || 0;
          const clicks = stat.clicks || 0;
          const spend = stat.spend || 0;
          const dailyCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          const dailyCpc = clicks > 0 ? spend / clicks : 0;

          doc.text(date, 50, yPosition, { width: columnWidth, align: 'left' });
          doc.text(impressions.toLocaleString(), 50 + columnWidth, yPosition, { width: columnWidth, align: 'left' });
          doc.text(clicks.toLocaleString(), 50 + (2 * columnWidth), yPosition, { width: columnWidth, align: 'left' });
          doc.text(spend.toFixed(2), 50 + (3 * columnWidth), yPosition, { width: columnWidth, align: 'left' });
          doc.text(dailyCtr.toFixed(2), 50 + (4 * columnWidth), yPosition, { width: columnWidth, align: 'left' });
          doc.text(dailyCpc.toFixed(2), 50 + (5 * columnWidth), yPosition, { width: columnWidth, align: 'left' });

          yPosition += 20;
        });
      } else {
        doc.fontSize(14).text('Não há dados de desempenho para o período selecionado.', { align: 'center' });
      }

      // Rodapé com data de geração
      doc.moveDown(4);
      doc.fontSize(10).text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
