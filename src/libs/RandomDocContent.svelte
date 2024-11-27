<!--
  - Copyright (c) 2023, Terwer . All rights reserved.
  - DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
  -
  - This code is free software; you can redistribute it and/or modify it
  - under the terms of the GNU General Public License version 2 only, as
  - published by the Free Software Foundation.  Terwer designates this
  - particular file as subject to the "Classpath" exception as provided
  - by Terwer in the LICENSE file that accompanied this code.
  -
  - This code is distributed in the hope that it will be useful, but WITHOUT
  - ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  - FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
  - version 2 for more details (a copy is included in the LICENSE file that
  - accompanied this code).
  -
  - You should have received a copy of the GNU General Public License version
  - 2 along with this work; if not, write to the Free Software Foundation,
  - Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
  -
  - Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
  - or visit www.terwer.space if you need additional information or have any
  - questions.
  -->

<script lang="ts">
  import { onMount } from "svelte"
  import { storeName } from "../Constants"
  import RandomDocConfig from "../models/RandomDocConfig"
  import { openTab, showMessage } from "siyuan"
  import RandomDocPlugin from "../index"
  import Loading from "./Loading.svelte"

  // props
  export let pluginInstance: RandomDocPlugin

  // vars
  let isLoading = false
  let storeConfig: RandomDocConfig
  let notebooks = []
  let toNotebookId = ""
  let title = "文档漫步"
  let tips = "信息提升"
  let currentRndId = ""
  let content = "暂无内容"

  let sqlList: any[] = []
  let currentSql = ""

  const getRndDocId = async () => {
    let rndId: string
    if (!storeConfig?.customSqlEnabled) {
      const rndResult = await pluginInstance.kernelApi.getRandomRootBlocks(toNotebookId)
      if (rndResult.code !== 0) {
        showMessage(pluginInstance.i18n.docFetchError, 7000, "error")
        throw new Error(rndResult.msg)
      }
      rndId = rndResult.data[0]?.root_id
      pluginInstance.logger.info(`使用自带的随机到 ${rndId}`)
    } else {
      const customRndResult = await pluginInstance.kernelApi.getCustomRandomDocId(currentSql)
      if (customRndResult.code !== 0) {
        showMessage(pluginInstance.i18n.docFetchError, 7000, "error")
        throw new Error(customRndResult.msg)
      }
      const firstKey = Object.keys(customRndResult.data[0])[0]
      rndId = customRndResult.data[0][firstKey]
      pluginInstance.logger.info(`使用自定义 SQL 随机到 ${rndId}`)
    }

    return rndId
  }

  // methods
  export const doRandomDoc = async () => {
    if (isLoading) {
      pluginInstance.logger.warn("上次随机还未结束，忽略")
      return
    }

    try {
      isLoading = true
      pluginInstance.logger.info("开始漫游...")
      // 生成漫游ID
      currentRndId = await getRndDocId()
      if (!currentRndId) {
        throw new Error(new Date().toISOString() + "：" + pluginInstance.i18n.docFetchError)
      }
      pluginInstance.logger.info(`已漫游到 ${currentRndId} ...`)

      //根块
      const rootBlock = await pluginInstance.kernelApi.getBlockByID(currentRndId)
      const doc = (await pluginInstance.kernelApi.getDoc(currentRndId)).data as any
      title = rootBlock.content
      content = doc.content ?? ""
      // 只读
      content = content.replace(/contenteditable="true"/g, 'contenteditable="false"')
      const total = await pluginInstance.kernelApi.getRootBlocksCount()
      const visitCount = parseInt(
        (await pluginInstance.kernelApi.getBlockAttrs(currentRndId))["custom-visit-count"] ?? 0
      )
      const newVisitCount = visitCount + 1
      await pluginInstance.kernelApi.setBlockAttrs(currentRndId, {
        "custom-visit-count": newVisitCount.toString(),
      })
      tips = `哇哦，穿越大山，跨过大河，在${total}篇文档中，我又为您找到了一篇新的，您已经访问过他${newVisitCount}次哦~`
    } catch (e) {
      tips = "文档漫游失败！=>" + e.toString()
    } finally {
      isLoading = false
    }
  }

  // events
  const notebookChange = async function () {
    // 显示当前选择的名称
    storeConfig.notebookId = toNotebookId
    await pluginInstance.saveData(storeName, storeConfig)
    pluginInstance.logger.info("storeConfig saved toNotebookId =>", storeConfig)
  }
  const onSqlChange = async function () {
    // 显示当前选择的名称
    storeConfig.currentSql = currentSql
    await pluginInstance.saveData(storeName, storeConfig)
    pluginInstance.logger.info("storeConfig saved currentSql =>", storeConfig)
  }

  const openDocEditor = async () => {
    await openTab({
      app: pluginInstance.app,
      doc: {
        id: currentRndId,
      },
    })
  }

  // lifecycle
  onMount(async () => {
    // 读取配置
    storeConfig = await pluginInstance.safeLoad(storeName)

    // 读取笔记本
    const res = await pluginInstance.kernelApi.lsNotebooks()
    notebooks = (res?.data as any)?.notebooks ?? []
    // 用户指南不应该作为可以写入的笔记本
    const hiddenNotebook: Set<string> = new Set(["思源笔记用户指南", "SiYuan User Guide"])
    // 没有必要把所有笔记本都列出来
    notebooks = notebooks.filter((notebook) => !notebook.closed && !hiddenNotebook.has(notebook.name))
    // 选中，若是没保存，获取第一个
    toNotebookId = storeConfig?.notebookId ?? notebooks[0].id

    // 处理自定义 sql
    if (storeConfig?.customSqlEnabled) {
      sqlList = JSON.parse(storeConfig?.sql ?? "[]")
      if (sqlList.length == 0) {
        showMessage(pluginInstance.i18n.customSqlEmpty, 7000, "error")
        return
      }
      currentSql = storeConfig?.currentSql ?? sqlList[0].sql
    }

    // 开始漫游
    await doRandomDoc()
  })
</script>

<div class="fn__flex-1 protyle" data-loading="finished">
  <Loading show={isLoading && storeConfig.showLoading} />
  <div class="protyle-content protyle-content--transition" data-fullwidth="true">
    <div class="protyle-title protyle-wysiwyg--attr" style="margin: 16px 96px 0px;">
      <div
        style="margin:20px 0"
        contenteditable="false"
        data-position="center"
        spellcheck="false"
        class="protyle-title__input"
        data-render="true"
      >
        {title}
      </div>
    </div>
    <div
      class="protyle-wysiwyg protyle-wysiwyg--attr"
      spellcheck="false"
      contenteditable="false"
      style="padding: 16px 96px 281.5px;"
      data-doc-type="NodeDocument"
    >
      <div class="action-btn-group">
        <button class="action-item b3-button b3-button--outline" on:click={openDocEditor}>新页签编辑</button>

        {#if storeConfig?.customSqlEnabled}
          <select
            class="action-item b3-select fn__flex-center fn__size200 notebook-select"
            bind:value={currentSql}
            on:change={onSqlChange}
          >
            {#if sqlList && sqlList.length > 0}
              {#each sqlList as s (s.sql)}
                <option value={s.sql}>{s.name}</option>
              {/each}
            {:else}
              <option value="">{pluginInstance.i18n.loading}...</option>
            {/if}
          </select>
          <span class="custom-sql">当前使用自定义 SQL 漫游</span>
        {:else}
          <span>
            <select
              class="action-item b3-select fn__flex-center fn__size200 notebook-select"
              bind:value={toNotebookId}
              on:change={notebookChange}
            >
              <option value="" selected>全部笔记本</option>
              {#if notebooks && notebooks.length > 0}
                {#each notebooks as notebook (notebook.id)}
                  <option value={notebook.id}>{notebook.name}</option>
                {/each}
              {:else}
                <option value="0">{pluginInstance.i18n.loading}...</option>
              {/if}
            </select>
          </span>
        {/if}

        <button class="action-item b3-button fr" on:click={doRandomDoc} title="⌥⌘M">
          {isLoading ? "正在漫游..." : "继续漫游(⌥⌘M)"}
        </button>
      </div>
      <div class="rnd-doc-custom-tips">
        <div
          data-type="NodeParagraph"
          class="p"
          style="color: var(--b3-card-info-color);background-color: var(--b3-card-info-background);"
        >
          <div class="t" contenteditable="false" spellcheck="false">{tips}</div>
          <div class="protyle-attr" contenteditable="false" />
        </div>
      </div>
      {@html content}
    </div>
  </div>
</div>

<style lang="stylus">
  .fr
    float right
  .custom-sql
    margin-left 20px
    color: red
    font-size 14px
  .action-btn-group
    margin:20px 0
    .action-item
      margin-left 10px
</style>
