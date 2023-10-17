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
  import StoreConfig from "../models/StoreConfig"
  import { openTab, showMessage } from "siyuan"
  import RandomDocPlugin from "../index"
  import Loading from "./Loading.svelte"

  // props
  export let pluginInstance: RandomDocPlugin

  // vars
  let isLoading = false
  let storeConfig: StoreConfig
  let notebooks = []
  let toNotebookId = ""
  let title = "文档漫步"
  let tips = "信息提升"
  let currentRndId = ""
  let content = "暂无内容"

  // methods
  export const doRandomDoc = async () => {
    if(isLoading){
      pluginInstance.logger.warn("上次随机还未结束，忽略")
      return
    }

    try {
      isLoading = true
      pluginInstance.logger.info("开始漫游...")
      // 生成漫游ID
      const rndResult = await pluginInstance.kernelApi.getRandomRootBlocks(toNotebookId)
      if (rndResult.code !== 0) {
        showMessage(pluginInstance.i18n.docFetchError, 7000, "error")
        throw new Error(rndResult.msg)
      }
      const rndId = rndResult.data[0]?.root_id
      currentRndId = rndId
      if (!rndId) {
        throw new Error(new Date().toISOString() + "：" + pluginInstance.i18n.docFetchError)
      }
      pluginInstance.logger.info(`已漫游到 ${rndId} ...`)

      //根块
      const rootBlock = await pluginInstance.kernelApi.getBlockByID(rndId)
      const doc = (await pluginInstance.kernelApi.getDoc(rndId)).data as any
      title = rootBlock.content
      content = doc.content ?? ""
      // 只读
      content = content.replace(/contenteditable="true"/g, 'contenteditable="false"')
      const total = await pluginInstance.kernelApi.getRootBlocksCount()
      const visitCount = parseInt((await pluginInstance.kernelApi.getBlockAttrs(rndId))["custom-visit-count"] ?? 0)
      const newVisitCount = visitCount + 1
      await pluginInstance.kernelApi.setBlockAttrs(rndId, {
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
    pluginInstance.logger.info("storeConfig saved =>", storeConfig)
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

    // 开始漫游
    await doRandomDoc()
  })
</script>

<div class="fn__flex-1 protyle" data-loading="finished">
  <Loading show={isLoading} />
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
        <span class="note-select-tip">选择漫游的笔记本：</span>
        <select
          class="action-item b3-select fn__flex-center fn__size200 notebook-select"
          bind:value={toNotebookId}
          on:change={notebookChange}
        >
          <option value="" selected>全部笔记本</option>
          {#each notebooks as notebook}
            <option value={notebook.id}>{notebook.name}</option>
          {:else}
            <option value="0">{pluginInstance.i18n.loading}...</option>
          {/each}
        </select>
        <span class="note-select-tip">继续漫游快捷键为：⌥⌘M</span>
        <button class="action-item b3-button fr" on:click={doRandomDoc} title="⌥⌘M">继续漫游</button>
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
  .note-select-tip
    margin-left 20px
  .action-btn-group
    margin:20px 0
    .action-item
      margin-left 10px
</style>
