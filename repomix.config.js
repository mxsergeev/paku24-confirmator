import { execSync } from 'node:child_process'

const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')

const commit = execSync('git rev-parse --short HEAD', {
  encoding: 'utf8',
}).trim()

const dirty =
  execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== ''
    ? '-dirty'
    : ''

export default {
  input: {
    maxFileSize: 52428800,
  },

  output: {
    filePath: `.repomix/confirmator-${timestamp}-${commit}${dirty}.xml`,
    style: 'xml',
    filePathStyle: 'target-relative',
    parsableStyle: false,
    fileSummary: true,
    directoryStructure: true,
    files: true,
    removeComments: false,
    removeEmptyLines: false,
    compress: false,
    topFilesLength: 5,
    showLineNumbers: false,
    truncateBase64: false,
    copyToClipboard: false,
    includeFullDirectoryStructure: false,
    tokenCountTree: false,

    git: {
      sortByChanges: true,
      sortByChangesMaxCommits: 100,
      includeDiffs: false,
      includeLogs: false,
      includeLogsCount: 50,
    },
  },

  // Manually choose what to include
  include: [],

  ignore: {
    useGitignore: true,
    useDotIgnore: true,
    useDefaultPatterns: true,

    // Stuff that is not included in .gitignore
    customPatterns: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.webp',
      '**/*.gif',
      '**/*.ico',
      '**/*.jfif',
      '**/*.svg',
      '**/*.xlsx',
      '**/*.pdf',

      '**/*.pem',
      '**/*.key',
    ],
  },

  security: {
    enableSecurityCheck: true,
  },

  tokenCount: {
    encoding: 'o200k_base',
  },
}
