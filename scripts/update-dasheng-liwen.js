#!/usr/bin/env node
/**
 * Update dasheng-liwen.json with content from CBETA source file
 *
 * Usage: node scripts/update-dasheng-liwen.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../../documents/saut/dasheng-liwen/T0829_001.txt');
const TARGET_FILE = path.join(__dirname, '../sutras/dasheng-liwen.json');

// Simple Traditional to Simplified Chinese conversion map (common characters)
// For a complete conversion, consider using opencc-js
const t2sMap = {
  '經': '经', '與': '与', '無': '无', '萬': '万', '億': '亿', '數': '数',
  '證': '证', '獲': '获', '處': '处', '調': '调', '諸': '诸', '遊': '游',
  '捨': '舍', '慚': '惭', '為': '为', '饒': '饶', '寶': '宝', '島': '岛',
  '於': '于', '達': '达', '礙': '碍', '際': '际', '別': '别', '雖': '虽',
  '厭': '厌', '護': '护', '間': '间', '遍': '遍', '稱': '称', '藏': '藏',
  '現': '现', '濟': '济', '衆': '众', '眾': '众', '誨': '诲', '賢': '贤',
  '憐': '怜', '愍': '悯', '著': '着', '令': '令', '莫': '莫', '淨': '净',
  '訶': '诃', '羅': '罗', '譯': '译', '聞': '闻', '時': '时', '闍': '阇',
  '崛': '崛', '薩': '萨', '勝': '胜', '辯': '辩', '積': '积', '輞': '辋',
  '髻': '髻', '嚴': '严', '爾': '尔', '觀': '观', '紹': '绍', '殊': '殊',
  '見': '见', '央': '央', '帝': '帝', '釋': '释', '勢': '势', '梵': '梵',
  '遍': '遍', '賢': '贤', '蓋': '盖', '藥': '药', '變': '变', '尊': '尊',
  '弗': '弗', '訶': '诃', '乾': '乾', '連': '连', '葉': '叶', '漢': '汉',
  '聲': '声', '威': '威', '猶': '犹', '閻': '阎', '樓': '楼', '叉': '叉',
  '濁': '浊', '屬': '属', '來': '来', '啟': '启', '請': '请', '種': '种',
  '過': '过', '異': '异', '奉': '奉', '坐': '坐', '蓮': '莲', '華': '华',
  '從': '从', '袒': '袒', '膝': '膝', '掌': '掌', '語': '语', '欲': '欲',
  '問': '问', '許': '许', '告': '告', '隨': '随', '意': '意', '眾': '众',
  '現': '现', '耳': '耳', '應': '应', '離': '离', '覺': '觉', '哉': '哉',
  '諦': '谛', '聽': '听', '當': '当', '說': '说', '貪': '贪', '瞋': '嗔',
  '癡': '痴', '疑': '疑', '憍': '憍', '慢': '慢', '懈': '懈', '怠': '怠',
  '惛': '昏', '愛': '爱', '護': '护', '謂': '谓', '己': '己', '加': '加',
  '物': '物', '禁': '禁', '戒': '戒', '殺': '杀', '偷': '偷', '盜': '盗',
  '重': '重', '財': '财', '侵': '侵', '順': '顺', '樂': '乐', '苦': '苦',
  '悉': '悉', '乃': '乃', '義': '义', '滅': '灭', '邊': '边', '實': '实',
  '業': '业', '緣': '缘', '電': '电', '普': '普', '懷': '怀', '般': '般',
  '若': '若', '攝': '摄', '幻': '幻', '焰': '焰', '味': '味', '脫': '脱',
  '即': '即', '相': '相', '非': '非', '因': '因', '增': '增', '減': '减',
  '詞': '词', '莊': '庄', '嚴': '严', '門': '门', '塵': '尘', '發': '发',
  '辟': '辟', '支': '支', '獄': '狱', '離': '离', '昧': '昧', '蒙': '蒙',
  '益': '益', '空': '空', '語': '语', '會': '会', '誓': '誓', '婆': '婆',
  '國': '国', '土': '土', '後': '后', '擁': '拥', '滿': '满', '足': '足',
  '器': '器', '廣': '广', '稀': '稀', '根': '根', '承': '承', '荷': '荷',
  '擔': '担', '決': '决', '定': '定', '臨': '临', '終': '终', '親': '亲',
  '彌': '弥', '陀': '陀', '圍': '围', '繞': '绕', '盡': '尽', '宿': '宿',
  '墮': '堕', '惡': '恶', '難': '难', '設': '设', '逆': '逆', '罪': '罪',
  '書': '书', '讀': '读', '誦': '诵', '解': '解', '障': '障', '鹹': '咸',
  '咸': '咸', '斯': '斯', '諸': '诸', '頂': '顶', '眼': '眼', '取': '取',
  '已': '已', '成': '成', '道': '道', '龍': '龙', '歡': '欢', '喜': '喜',
  '信': '信', '受': '受', '奉': '奉', '行': '行', '復': '复', '持': '持',
  '常': '常', '法': '法', '甚': '甚', '深': '深', '微': '微', '妙': '妙',
  '劫': '劫', '遭': '遭', '遇': '遇', '今': '今', '得': '得', '願': '愿',
  '真': '真', '上': '上', '報': '报', '恩': '恩', '下': '下', '途': '途',
  '者': '者', '提': '提', '此': '此', '身': '身', '同': '同', '生': '生',
  '極': '极', '頭': '头', '嚩': '嚩', '攞': '攞', '靺': '靺', '多': '多',
  '野': '野', '男': '男', '女': '女', '魔': '魔', '王': '王', '破': '破',
  '壞': '坏', '住': '住', '恆': '恒', '恒': '恒', '衛': '卫', '衣': '衣',
  '食': '食', '豐': '丰', '溢': '溢', '疾': '疾', '橫': '横', '畢': '毕',
  '竟': '竟', '摩': '摩', '記': '记', '唵': '唵', '毘': '毗', '嚧': '噜',
  '母': '母', '捺': '捺', '抳': '抳', '鉢': '钵', '入': '入', '吽': '吽',
  '達': '达', '嚫': '嚫', '黎': '黎', '么': '么', '你': '你', '葉': '叶',
  '謦': '謦', '嚧': '噜', '佉': '佉', '訶': '诃'
};

function traditionalToSimplified(text) {
  let result = '';
  for (const char of text) {
    result += t2sMap[char] || char;
  }
  return result;
}

function parseSourceFile(content) {
  const lines = content.split('\n');
  const paragraphs = [];

  let inContent = false;
  let currentParagraph = '';

  for (const line of lines) {
    // Skip header comments
    if (line.startsWith('#')) continue;

    // Skip catalog numbers
    if (line.startsWith('No.')) continue;

    // Skip empty lines but mark content start
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph);
        currentParagraph = '';
      }
      continue;
    }

    // Skip the title line and last title line
    if (trimmed === '大乘離文字普光明藏經') continue;

    // Skip translator line (will be set separately)
    if (trimmed.includes('天竺三藏') && trimmed.includes('譯')) continue;

    // Accumulate content
    currentParagraph = trimmed;
    if (currentParagraph) {
      paragraphs.push(currentParagraph);
      currentParagraph = '';
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }

  return paragraphs;
}

function main() {
  console.log('Reading source file...');
  const sourceContent = fs.readFileSync(SOURCE_FILE, 'utf-8');

  console.log('Parsing content...');
  const paragraphs = parseSourceFile(sourceContent);

  console.log(`Found ${paragraphs.length} paragraphs`);

  // Convert to simplified Chinese
  console.log('Converting to simplified Chinese...');
  const simplifiedParagraphs = paragraphs.map(p => traditionalToSimplified(p));

  // Create the JSON structure
  const sutraData = {
    id: 'dasheng-liwen',
    title: '大乘离文字普光明藏经',
    translator: '唐 中天竺三藏法师地婆诃罗 奉诏译',
    openingVerse: [
      '无上甚深微妙法',
      '百千万劫难遭遇',
      '我今见闻得受持',
      '愿解如来真实义'
    ],
    chapters: [
      {
        title: '大乘离文字普光明藏经',
        paragraphs: simplifiedParagraphs
      }
    ],
    dedication: [
      '愿以此功德',
      '庄严佛净土',
      '上报四重恩',
      '下济三途苦',
      '若有见闻者',
      '悉发菩提心',
      '尽此一报身',
      '同生极乐国'
    ]
  };

  console.log('Writing JSON file...');
  fs.writeFileSync(TARGET_FILE, JSON.stringify(sutraData, null, 2), 'utf-8');

  console.log('Done! Updated:', TARGET_FILE);
  console.log('Paragraphs:', sutraData.chapters[0].paragraphs.length);
}

main();
